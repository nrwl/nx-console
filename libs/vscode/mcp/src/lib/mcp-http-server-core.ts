import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  mcpServerInstructions,
  MINIMAL_EXCLUDED_TOOLS,
  NxMcpServerWrapper,
} from '@nx-console/nx-mcp-server';
import { randomUUID } from 'crypto';
import {
  GlobalConfigurationStore,
  getNxWorkspacePath,
} from '@nx-console/vscode-configuration';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import express, { Request, Response } from 'express';
import { ideProvider, nxWorkspaceInfoProvider } from './data-providers';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';

export interface McpHttpServerCoreOptions {
  minimal?: boolean;
}

/**
 * Core HTTP server for MCP - platform agnostic
 * This can be used by both VSCode and Cursor
 */
export class McpHttpServerCore {
  private app: express.Application = express();
  private appInstance?: ReturnType<express.Application['listen']>;
  private streamableServers = new Set<NxMcpServerWrapper>();
  private options: McpHttpServerCoreOptions;

  constructor(
    private mcpPort: number,
    options: McpHttpServerCoreOptions = {},
  ) {
    this.options = options;
    this.startStreamableWebServer(mcpPort);
  }

  private startStreamableWebServer(port: number) {
    this.app.use(express.json());
    const sessions: Record<string, StreamableHTTPServerTransport> = {};

    // POST: Handle initialization and all client->server messages
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        let transport: StreamableHTTPServerTransport | undefined = sessionId
          ? sessions[sessionId]
          : undefined;

        if (!transport) {
          if (!isInitializeRequest(req.body)) {
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            });
            return;
          }

          vscodeLogger.log('Initializing new MCP session');
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: async (id) => {
              sessions[id] = transport!;
              vscodeLogger.log(`Session initialized: ${id}`);
            },
            onsessionclosed: (id) => {
              delete sessions[id];
              vscodeLogger.log(`Session closed: ${id}`);
            },
          });

          const mcpServer = new McpServer(
            {
              name: 'Nx MCP',
              version: '0.0.1',
            },
            {
              instructions: mcpServerInstructions,
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

          let toolsFilter: string[] | undefined =
            GlobalConfigurationStore.instance.get('mcpToolsFilter') ??
            undefined;

          if (this.options.minimal) {
            vscodeLogger.log(
              'Minimal mode enabled: The following MCP tools have been disabled because they have been replaced by skills: nx_available_plugins, nx_workspace_path, nx_workspace, nx_project_details, nx_generators, nx_generator_schema. To re-enable them, set nxConsole.mcpMinimalMode to false.',
            );
            toolsFilter = toolsFilter
              ? [...toolsFilter, ...MINIMAL_EXCLUDED_TOOLS]
              : [...MINIMAL_EXCLUDED_TOOLS];
          }

          const server = await NxMcpServerWrapper.create(
            nxWorkspacePath,
            nxWorkspaceInfoProvider,
            mcpServer,
            ideProvider,
            getTelemetry(),
            vscodeLogger,
            toolsFilter,
          );

          this.streamableServers.add(server);
          await server.getMcpServer().connect(transport);
        }

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

    // GET: Open SSE stream for server->client messages
    this.app.get('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const transport = sessionId && sessions[sessionId];

      if (!transport) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }

      await transport.handleRequest(req, res);
    });

    // DELETE: Allow clients to explicitly terminate sessions
    this.app.delete('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      const transport = sessionId && sessions[sessionId];

      if (!transport) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }

      await transport.handleRequest(req, res);
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
    vscodeLogger.log('Stopping MCP server');
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
