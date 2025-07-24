import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
  IdeProvider,
} from '@nx-console/nx-mcp-server';
import { getGraphWebviewManager } from '@nx-console/vscode-project-graph';
import { openGenerateUi } from '@nx-console/vscode-generate-ui-webview';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getGenerators, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getGitDiffs, vscodeLogger } from '@nx-console/vscode-utils';
import express, { Request, Response } from 'express';

export class McpWebServer {
  private static instance: McpWebServer;
  public static get Instance() {
    if (!McpWebServer.instance) {
      McpWebServer.instance = new McpWebServer();
    }
    return McpWebServer.instance;
  }

  private constructor() {
    // Singleton pattern
  }

  private app: express.Application = express();
  private appInstance?: ReturnType<express.Application['listen']>;
  private serverStartupFailed = false;

  private sseKeepAliveInterval?: NodeJS.Timeout;
  private sseTransport?: SSEServerTransport;
  private sseServer?: NxMcpServerWrapper;
  private fullSseSetupReady = false;

  private streamableServers = new Set<NxMcpServerWrapper>();
  ideProvider: IdeProvider = {
    isAvailable: () => true,
    focusProject: async (projectName: string) => {
      const graphManager = getGraphWebviewManager();
      await graphManager.focusProject(projectName);
    },
    focusTask: async (projectName: string, taskName: string) => {
      const graphManager = getGraphWebviewManager();
      await graphManager.focusTarget(projectName, taskName);
    },
    showFullProjectGraph: async () => {
      const graphManager = getGraphWebviewManager();
      await graphManager.showAllProjects();
    },
    openGenerateUi: async (
      generatorName: string,
      options: Record<string, unknown>,
      cwd?: string,
    ) => {
      // VSCode generate UI doesn't return a log file name like the standalone version
      // So we'll return a placeholder that indicates success
      await openGenerateUi();
      return 'generator-ui-opened';
    },
    onConnectionChange: () => () => {
      // No-op for VSCode since it's always connected
    },
    dispose: () => {
      // No-op cleanup
    },
  };

  public startSkeletonMcpServer(port: number) {
    this.app.get('/sse', async (req, res) => {
      vscodeLogger.log('SSE connection established');

      this.sseTransport = new SSEServerTransport('/messages', res);

      if (this.fullSseSetupReady) {
        await this.doCompleteSseServerSetup();
      }

      // Set up a keep-alive interval to prevent timeout
      this.sseKeepAliveInterval = setInterval(() => {
        if (!res.writableEnded && !res.writableFinished) {
          res.write(':beat\n\n');
        } else {
          clearInterval(this.sseKeepAliveInterval);
          vscodeLogger.log(
            'SSE connection closed, clearing keep-alive interval',
          );
        }
      }, 20000);

      req.on('close', () => {
        clearInterval(this.sseKeepAliveInterval);
        vscodeLogger.log('SSE connection closed by client');
      });
    });

    this.app.post('/messages', async (req, res) => {
      vscodeLogger.log(`Message received`);
      if (!this.sseTransport) {
        res.status(400).send('No transport found');
        return;
      }
      await this.sseTransport.handlePostMessage(req, res);
    });

    this.app.post('/mcp', async (req: Request, res: Response) => {
      vscodeLogger.log('Connecting to MCP via streamable http');
      try {
        const server = await NxMcpServerWrapper.create(
          getNxWorkspacePath(),
          nxWorkspaceInfoProvider,
          ideProvider,
          getTelemetry(),
          vscodeLogger,
        );
        const transport: StreamableHTTPServerTransport =
          new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });

        this.streamableServers.add(server);
        res.on('close', () => {
          vscodeLogger.log('Request closed');
          transport.close();
          server.getMcpServer().close();
        });
        await server.getMcpServer().connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        vscodeLogger.log('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    this.app.get('/mcp', async (req: Request, res: Response) => {
      vscodeLogger.log('Received GET MCP request');
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed.',
          },
          id: null,
        }),
      );
    });

    this.app.delete('/mcp', async (req: Request, res: Response) => {
      vscodeLogger.log('Received DELETE MCP request');
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed.',
          },
          id: null,
        }),
      );
    });

    try {
      this.appInstance = this.app.listen(port, () => {
        vscodeLogger.log(`MCP server started on port ${port}`);
        this.serverStartupFailed = false;
      });

      this.appInstance.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          vscodeLogger.log(
            `Port ${port} is already in use. Another VS Code/Cursor instance likely has an MCP server running on this port.`,
          );
        } else {
          vscodeLogger.log(`Failed to start MCP server: ${error.message}`);
        }
        this.serverStartupFailed = true;
      });
    } catch (error) {
      // This catch might not be necessary with the error event handler, but keeping for safety
      vscodeLogger.log(`Failed to start MCP server: ${error}`);
      this.serverStartupFailed = true;
    }
  }

  public async completeMcpServerSetup() {
    if (this.fullSseSetupReady || this.serverStartupFailed) {
      return;
    }

    this.fullSseSetupReady = true;

    if (!this.sseTransport) {
      return;
    }

    await this.doCompleteSseServerSetup();
  }

  private async doCompleteSseServerSetup() {
    const server = await NxMcpServerWrapper.create(
      getNxWorkspacePath(),
      nxWorkspaceInfoProvider,
      this.ideProvider,
      getTelemetry(),
      vscodeLogger,
    );

    await server.getMcpServer().connect(this.sseTransport!);

    this.sseServer = server;
  }

  public stopMcpServer() {
    getOutputChannel().appendLine('Stopping MCP server');
    this.streamableServers.forEach((server) => {
      server.getMcpServer().close();
    });
    this.streamableServers.clear();
    if (this.appInstance) {
      this.appInstance.close();
    }
    if (this.sseKeepAliveInterval) {
      clearInterval(this.sseKeepAliveInterval);
    }
    this.serverStartupFailed = false;
  }

  public async updateMcpServerWorkspacePath(workspacePath: string) {
    for (const server of this.streamableServers.values()) {
      server.setNxWorkspacePath(workspacePath);
    }
    await this.sseServer?.setNxWorkspacePath(workspacePath);
  }
}

const nxWorkspaceInfoProvider: NxWorkspaceInfoProvider = {
  nxWorkspace: async (_, __, reset) => await getNxWorkspace(reset),
  getGenerators: async (_, options) => await getGenerators(options),
  getGitDiffs: async (workspacePath, baseSha, headSha) => {
    return getGitDiffs(workspacePath, baseSha, headSha);
  },
  isNxCloudEnabled: async () =>
    await isNxCloudUsed(getNxWorkspacePath(), vscodeLogger),
};
