import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { NxMcpServerWrapper } from '@nx-console/nx-mcp-server';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { vscodeLogger } from '@nx-console/vscode-utils';
import express, { Request, Response } from 'express';
import {
  CancellationToken,
  McpHttpServerDefinition,
  McpServerDefinitionProvider,
  Uri,
} from 'vscode';
import { ideProvider, nxWorkspaceInfoProvider } from './data-providers';

export class NxMcpServerDefinitionProvider
  implements McpServerDefinitionProvider<NxMcpHttpServerDefinition>
{
  constructor(private server: McpStreamableWebServer | undefined) {}

  async provideMcpServerDefinitions(
    token: CancellationToken,
  ): Promise<NxMcpHttpServerDefinition[] | undefined> {
    if (this.server === undefined) {
      return undefined;
    }
    return [
      new NxMcpHttpServerDefinition('Nx Mcp Server', this.server.getUri()),
    ];
  }
}

export class NxMcpHttpServerDefinition extends McpHttpServerDefinition {
  constructor(
    label: string,
    uri: Uri,
    headers?: Record<string, string>,
    version?: string,
  ) {
    super(label, uri, headers, version);
  }
}

export class McpStreamableWebServer {
  private app: express.Application = express();
  private appInstance?: ReturnType<express.Application['listen']>;

  constructor(private mcpPort: number) {
    this.startStreamableWebServer(mcpPort);
  }

  private streamableServers = new Set<NxMcpServerWrapper>();

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
        const server = await NxMcpServerWrapper.create(
          getNxWorkspacePath(),
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

  public getUri(): Uri {
    return Uri.parse(`http://localhost:${this.mcpPort}/mcp`);
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
