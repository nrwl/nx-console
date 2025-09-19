import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { NxMcpServerWrapper } from '@nx-console/nx-mcp-server';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getOutputChannel,
  vscodeLogger,
} from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import express, { Request, Response } from 'express';
import { ideProvider, nxWorkspaceInfoProvider } from './data-providers';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';

/**
 * Core HTTP server for MCP - platform agnostic
 * This can be used by both VSCode and Cursor
 */
export class McpHttpServerCore {
  private app: express.Application = express();
  private appInstance?: ReturnType<express.Application['listen']>;
  private streamableServers = new Set<NxMcpServerWrapper>();

  constructor(private mcpPort: number) {
    this.startStreamableWebServer(mcpPort);
  }

  private startStreamableWebServer(port: number) {
    this.app.post('/mcp', async (req: Request, res: Response) => {
      vscodeLogger.log('Connecting to MCP via streamable http');
      try {
        const mcpServer = new McpServer(
          {
            name: 'Nx MCP',
            version: '0.0.1',
          },
          {
            capabilities: {
              tools: {
                listChanged: true,
              },
            },
          },
        );
        const providedPath = getNxWorkspacePath();
        const nxWorkspacePath = (await checkIsNxWorkspace(providedPath))
          ? providedPath
          : undefined;
        const server = await NxMcpServerWrapper.create(
          nxWorkspacePath,
          nxWorkspaceInfoProvider,
          mcpServer,
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
      });

      this.appInstance.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          vscodeLogger.log(
            `Port ${port} is already in use. Another VS Code/Cursor instance likely has an MCP server running on this port.`,
          );
        } else {
          vscodeLogger.log(`Failed to start MCP server: ${error.message}`);
        }
      });
    } catch (error) {
      // This catch might not be necessary with the error event handler, but keeping for safety
      vscodeLogger.log(`Failed to start MCP server: ${error}`);
    }
  }

  /**
   * Get the URL of the server as a string
   */
  public getUrl(): string {
    return `http://localhost:${this.mcpPort}/mcp`;
  }

  /**
   * Get the port number
   */
  public getPort(): number {
    return this.mcpPort;
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
  }

  public async updateMcpServerWorkspacePath(workspacePath: string) {
    for (const server of this.streamableServers.values()) {
      server.setNxWorkspacePath(workspacePath);
    }
  }
}
