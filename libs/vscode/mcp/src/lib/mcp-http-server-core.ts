import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer, isInitializeRequest } from '@modelcontextprotocol/server';
import {
  mcpServerInstructions,
  MINIMAL_EXCLUDED_TOOLS,
  NxMcpServerWrapper,
  nxMcpServerCapabilities,
} from '@nx-console/nx-mcp-server';
import { randomUUID } from 'crypto';
import {
  GlobalConfigurationStore,
  getNxWorkspacePath,
} from '@nx-console/vscode-configuration';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import express, { Request, Response } from 'express';
import { createServer, Server } from 'http';
import { ideProvider, nxWorkspaceInfoProvider } from './data-providers';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';

export interface McpHttpServerCoreOptions {
  minimal?: boolean;
  /**
   * Sessions without a request or an open stream for this long are closed.
   * Clients that come back get a 404 and start a new session, as the MCP
   * specification requires.
   */
  sessionIdleTimeoutMs?: number;
}

interface McpSession {
  transport: NodeStreamableHTTPServerTransport;
  server: NxMcpServerWrapper;
  lastActivity: number;
  openStreams: number;
}

const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 60 * 60_000;

/**
 * Core HTTP server for MCP - platform agnostic
 * This can be used by both VSCode and Cursor
 */
export class McpHttpServerCore {
  private app: express.Application = express();
  private appInstance?: Server;
  private appInstanceV6?: Server;
  private sessions = new Map<string, McpSession>();
  private pendingServers = new Set<NxMcpServerWrapper>();
  private idleSweep?: NodeJS.Timeout;
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

    // POST: Handle initialization and all client->server messages
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        if (sessionId) {
          const session = this.touchSession(sessionId, res);
          if (!session) {
            return;
          }
          this.trackOpenResponse(session, res);
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

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
        // eslint-disable-next-line prefer-const -- assigned after the transport that references it
        let server: NxMcpServerWrapper;
        const transport: NodeStreamableHTTPServerTransport =
          new NodeStreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: async (id) => {
              this.pendingServers.delete(server);
              this.sessions.set(id, {
                transport,
                server,
                lastActivity: Date.now(),
                openStreams: 0,
              });
              vscodeLogger.log(`Session initialized: ${id}`);
            },
            onsessionclosed: (id) => {
              vscodeLogger.log(`Session closed: ${id}`);
              this.closeSession(id);
            },
          });

        const mcpServer = new McpServer(
          {
            name: 'Nx MCP',
            version: '0.0.1',
          },
          {
            instructions: mcpServerInstructions,
            capabilities: nxMcpServerCapabilities,
          },
        );

        const providedPath = getNxWorkspacePath();
        const nxWorkspacePath = (await checkIsNxWorkspace(providedPath))
          ? providedPath
          : undefined;

        let toolsFilter: string[] | undefined =
          GlobalConfigurationStore.instance.get('mcpToolsFilter') ?? undefined;

        if (this.options.minimal) {
          vscodeLogger.log(
            'Minimal mode enabled: The following MCP tools have been disabled because they have been replaced by skills: nx_available_plugins, nx_workspace_path, nx_workspace, nx_project_details, nx_generators, nx_generator_schema.',
          );
          toolsFilter = toolsFilter
            ? [...toolsFilter, ...MINIMAL_EXCLUDED_TOOLS]
            : [...MINIMAL_EXCLUDED_TOOLS];
        }

        server = await NxMcpServerWrapper.create(
          nxWorkspacePath,
          nxWorkspaceInfoProvider,
          mcpServer,
          ideProvider,
          getTelemetry(),
          vscodeLogger,
          toolsFilter,
        );

        this.pendingServers.add(server);
        try {
          await server.getMcpServer().connect(transport);
          await transport.handleRequest(req, res, req.body);
        } finally {
          // an initialize request that did not produce a session leaves nothing behind
          if (this.pendingServers.delete(server)) {
            await server.close().catch(() => undefined);
          }
        }
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
      const session = this.touchSession(
        req.headers['mcp-session-id'] as string | undefined,
        res,
      );
      if (!session) {
        return;
      }

      this.trackOpenResponse(session, res);
      await session.transport.handleRequest(req, res);
    });

    // DELETE: Allow clients to explicitly terminate sessions
    this.app.delete('/mcp', async (req: Request, res: Response) => {
      const session = this.touchSession(
        req.headers['mcp-session-id'] as string | undefined,
        res,
      );
      if (!session) {
        return;
      }

      await session.transport.handleRequest(req, res);
    });

    const idleTimeout =
      this.options.sessionIdleTimeoutMs ?? DEFAULT_SESSION_IDLE_TIMEOUT_MS;
    this.idleSweep = setInterval(
      () => this.closeIdleSessions(idleTimeout),
      Math.min(idleTimeout, 5 * 60_000),
    );
    this.idleSweep.unref();

    // Loopback only: the endpoint has no authentication. Both address families
    // are bound because clients resolve `localhost` to either.
    this.appInstance = createServer(this.app).listen(port, '127.0.0.1', () => {
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

    this.appInstanceV6 = createServer(this.app).listen({
      port,
      host: '::1',
      ipv6Only: true,
    });
    this.appInstanceV6.on('error', (error: NodeJS.ErrnoException) => {
      // IPv6 can be disabled on the machine; IPv4 alone is enough then
      if (error.code !== 'EADDRNOTAVAIL' && error.code !== 'EAFNOSUPPORT') {
        vscodeLogger.log(
          `Failed to start MCP server on [::1]:${port}: ${error.message}`,
        );
      }
    });
  }

  private touchSession(
    sessionId: string | undefined,
    res: Response,
  ): McpSession | undefined {
    if (!sessionId) {
      res.status(400).send('Missing session ID');
      return undefined;
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Session not found' },
        id: null,
      });
      return undefined;
    }
    session.lastActivity = Date.now();
    return session;
  }

  // A response can stay open for a long time: a GET stream, or a POST whose
  // tool call streams its result. The session is not idle while one is open.
  private trackOpenResponse(session: McpSession, res: Response) {
    session.openStreams++;
    res.on('close', () => {
      session.openStreams--;
      session.lastActivity = Date.now();
    });
  }

  private closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.sessions.delete(sessionId);
    session.server.close().catch((error) => {
      vscodeLogger.log(`Error closing MCP session ${sessionId}:`, error);
    });
  }

  private closeIdleSessions(idleTimeoutMs: number) {
    const cutoff = Date.now() - idleTimeoutMs;
    for (const [id, session] of this.sessions) {
      if (session.openStreams === 0 && session.lastActivity < cutoff) {
        vscodeLogger.log(`Closing idle MCP session ${id}`);
        this.closeSession(id);
      }
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
    clearInterval(this.idleSweep);
    for (const id of [...this.sessions.keys()]) {
      this.closeSession(id);
    }
    for (const server of this.pendingServers) {
      server.close().catch(() => undefined);
    }
    this.pendingServers.clear();
    this.appInstance?.close();
    this.appInstanceV6?.close();
  }

  public async updateMcpServerWorkspacePath(workspacePath: string) {
    for (const { server } of this.sessions.values()) {
      server.setNxWorkspacePath(workspacePath);
    }
  }
}
