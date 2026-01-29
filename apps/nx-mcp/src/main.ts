import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  IdeProvider,
  mcpServerInstructions,
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import { gte } from '@nx-console/nx-version';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { getRecentCIPEData, isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import {
  getGenerators,
  getNxVersion,
  nxWorkspace,
  resetStatus,
} from '@nx-console/shared-nx-workspace-info';
import {
  GoogleAnalytics,
  NxConsoleTelemetryLogger,
} from '@nx-console/shared-telemetry';
import { IIdeJsonRpcClient } from '@nx-console/shared-types';
import {
  consoleLogger,
  killGroup,
  loadRootEnvFiles,
} from '@nx-console/shared-utils';
import { PassiveDaemonWatcher } from '@nx-console/shared-watcher';
import { randomUUID } from 'crypto';
import express from 'express';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { resolve } from 'path';
import { hideBin } from 'yargs/helpers';
import { ensureOnlyJsonRpcStdout } from './ensureOnlyJsonRpcStdout';
import { createIdeClient } from './ide-client/create-ide-client';
import { getPackageVersion } from './utils';
import { ArgvType, createYargsConfig } from './yargs-config';

async function main() {
  const argv = createYargsConfig(hideBin(process.argv)).parseSync() as ArgvType;

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

  let mcpStdioConnected = false;
  let logger: {
    log: (message: string) => void;
    debug?: (message: string) => void;
  } = consoleLogger;

  if (argv.transport === 'stdio') {
    logger = {
      log: (data: string) => {
        if (mcpStdioConnected) {
          mcpServer.server.sendLoggingMessage({
            level: 'info',
            data,
          });
        } else {
          // do nothing
        }
      },
      debug: (data: string) => {
        if (argv.debugLogs && mcpStdioConnected) {
          mcpServer.server.sendLoggingMessage({
            level: 'info',
            data,
          });
        }
      },
    };
    ensureOnlyJsonRpcStdout();
  } else {
    logger = {
      log: consoleLogger.log,
      debug: (message: string) => {
        if (argv.debugLogs) {
          consoleLogger.log?.(message);
        }
      },
    };
  }

  logger.log('Starting Nx MCP server');

  // Normalize tools filter to always be an array or undefined
  let toolsFilter: string[] | undefined = argv.tools
    ? Array.isArray(argv.tools)
      ? argv.tools
      : [argv.tools]
    : undefined;

  // When --minimal is set, exclude workspace analysis tools
  if (argv.minimal) {
    const minimalExcludedTools = [
      '!nx_available_plugins',
      '!nx_workspace_path',
      '!nx_workspace',
      '!nx_project_details',
      '!nx_generators',
      '!nx_generator_schema',
    ];
    toolsFilter = toolsFilter
      ? [...toolsFilter, ...minimalExcludedTools]
      : minimalExcludedTools;
    logger.log('Minimal mode enabled, hiding workspace analysis tools');
  }

  // When --experimental-polygraph is not set (default), exclude polygraph tools
  if (!argv.experimentalPolygraph) {
    const polygraphExcludedTools = ['!cloud_polygraph_*'];
    toolsFilter = toolsFilter
      ? [...toolsFilter, ...polygraphExcludedTools]
      : polygraphExcludedTools;
  } else {
    logger.log('Experimental Polygraph tools enabled');
  }

  if (toolsFilter && toolsFilter.length > 0) {
    logger.log(`Tools filter: ${toolsFilter.join(', ')}`);
  }

  const providedPath: string = resolve(
    argv.workspacePath || (argv._[0] as string) || process.cwd(),
  ) as string;

  // Check if the provided path is an Nx workspace
  const isNxWorkspace = await checkIsNxWorkspace(providedPath);
  const nxWorkspacePath = isNxWorkspace ? providedPath : undefined;

  if (nxWorkspacePath) {
    loadRootEnvFiles(nxWorkspacePath);
  }

  let googleAnalytics: GoogleAnalytics | undefined;

  if (!argv.disableTelemetry) {
    const clientId = randomUUID();
    googleAnalytics = new GoogleAnalytics(
      'production',
      clientId,
      clientId,
      clientId,
      getPackageVersion(),
      'nx-mcp',
    );
  }

  const telemetryLogger: NxConsoleTelemetryLogger = {
    logUsage: (eventName, data) => {
      googleAnalytics?.sendEventData(eventName, data);
    },
  };

  const nxWorkspaceInfoProvider: NxWorkspaceInfoProvider = {
    nxWorkspace,
    getGenerators,
    getGitDiffs: async () => {
      // todo(cammisuli): implement this using standard git commands
      return undefined;
    },
    isNxCloudEnabled: async () =>
      nxWorkspacePath ? await isNxCloudUsed(nxWorkspacePath) : false,
    getRecentCIPEData: async (workspacePath, logger, options) =>
      await getRecentCIPEData(workspacePath, logger, options),
  };

  // Detect if IDE is running and create IDE client if available
  let ideClient: IIdeJsonRpcClient | undefined;
  let ideAvailable = false;

  if (nxWorkspacePath) {
    logger.log('Checking for IDE connection...');
    try {
      const ideConnection = await createIdeClient(nxWorkspacePath);
      ideClient = ideConnection.client;
      ideAvailable = ideConnection.available;
    } catch (error) {
      logger.log('Error checking for IDE connection: ' + error);
    }

    if (ideAvailable) {
      logger.log('Successfully connected to IDE');
    } else {
      logger.log('No IDE detected, running in standalone mode');
    }
  }

  // Create IDE provider based on connection status
  const ideProvider: IdeProvider = ideClient
    ? {
        isAvailable: () => ideAvailable,
        focusProject: async (projectName: string) => {
          if (!ideClient) throw new Error('No IDE client available');
          await ideClient.focusProject(projectName);
        },
        focusTask: async (projectName: string, taskName: string) => {
          if (!ideClient) throw new Error('No IDE client available');
          await ideClient.focusTask(projectName, taskName);
        },
        showFullProjectGraph: async () => {
          if (!ideClient) throw new Error('No IDE client available');
          await ideClient.showFullProjectGraph();
        },
        getRunningTasks: async () => {
          if (!ideClient) throw new Error('No IDE client available');
          return await ideClient.getRunningTasks();
        },
        onConnectionChange: (callback: (available: boolean) => void) => {
          // Set up disconnection handler if the client supports it
          if (
            ideClient &&
            'onDisconnection' in ideClient &&
            typeof (ideClient as any).onDisconnection === 'function'
          ) {
            (ideClient as any).onDisconnection(() => {
              logger.log('IDE client disconnected');
              callback(false);
            });
          }
          return () => {
            // No-op cleanup since we can't remove the disconnection handler
          };
        },
        dispose: () => {
          if (ideClient) {
            try {
              ideClient.disconnect();
              logger.log('IDE client disconnected');
            } catch (error) {
              logger.log(`Error disconnecting IDE client: ${error}`);
            }
          }
        },
      }
    : undefined;

  const serverWrapper = await NxMcpServerWrapper.create(
    nxWorkspacePath,
    nxWorkspaceInfoProvider,
    mcpServer,
    ideProvider,
    telemetryLogger,
    logger,
    toolsFilter,
  );

  // disposables for shutting down
  let sseKeepAliveInterval: NodeJS.Timeout | undefined;
  let server_instance:
    | Server<typeof IncomingMessage, typeof ServerResponse>
    | undefined;

  /* eslint-disable no-empty */
  let exiting = false;
  const exitHandler = (signal: NodeJS.Signals) => {
    if (exiting) return;
    exiting = true;

    try {
      logger.log(`Shutting down Nx MCP (${signal})…`);

      // Stop watchers/timers first (prevents new work)
      try {
        stopWatcher?.();
      } catch {}
      if (sseKeepAliveInterval) {
        clearInterval(sseKeepAliveInterval);
        sseKeepAliveInterval = undefined;
      }

      // make sure exit handlers are removed so nothing else comes in
      try {
        process.off('SIGINT', exitHandler);
      } catch {}
      try {
        process.off('SIGTERM', exitHandler);
      } catch {}

      // Tell internal components to close
      try {
        serverWrapper.cleanup();
      } catch (e) {
        logger.log('cleanup error: ' + e);
      }
      try {
        mcpServer.close?.();
      } catch {}

      try {
        ideClient.disconnect?.();
      } catch {}

      // Close transports/servers
      try {
        server_instance?.close();
      } catch {}

      try {
        if (process.connected) {
          process.disconnect();
        }
      } catch {}

      killGroup(process.pid);
    } catch (e) {
    } finally {
      process.exit(1);
    }
  };

  if (argv.transport === 'sse' || argv.transport === 'http') {
    const port = argv.port ?? 9921;
    const app = express();

    if (argv.transport === 'http') {
      const sessions: Record<string, StreamableHTTPServerTransport> = {};

      app.use(express.json());

      // POST: Handle initialization and all client->server messages
      app.post('/mcp', async (req, res) => {
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

          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: async (id) => {
              sessions[id] = transport!;
              logger.log(`Session initialized: ${id}`);
            },
            onsessionclosed: (id) => {
              delete sessions[id];
              logger.log(`Session closed: ${id}`);
            },
          });

          const sessionMcpServer = new McpServer(
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

          const connectionServer = await NxMcpServerWrapper.create(
            nxWorkspacePath,
            nxWorkspaceInfoProvider,
            sessionMcpServer,
            ideProvider,
            telemetryLogger,
            logger,
            toolsFilter,
          );

          await connectionServer.getMcpServer().connect(transport);
        }

        await transport.handleRequest(req, res, req.body);
      });

      // GET: Open SSE stream for server->client messages
      app.get('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        const transport = sessionId && sessions[sessionId];

        if (!transport) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }

        await transport.handleRequest(req, res);
      });

      // DELETE: Allow clients to explicitly terminate sessions
      app.delete('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        const transport = sessionId && sessions[sessionId];

        if (!transport) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }

        await transport.handleRequest(req, res);
      });

      logger.log(`Nx MCP server (Streamable HTTP) listening on port ${port}`);
    } else {
      // SSE mode
      let transport: SSEServerTransport;
      app.get('/sse', async (req, res) => {
        logger.log('Configuring SSE transport');
        transport = new SSEServerTransport('/messages', res);
        await serverWrapper.getMcpServer().connect(transport);

        // Set up keep-alive interval if enabled
        if (argv.keepAliveInterval > 0) {
          sseKeepAliveInterval = setInterval(() => {
            // Check if the connection is still open using the socket's writable state
            if (!res.writableEnded && !res.writableFinished) {
              res.write(':beat\n\n');
            } else {
              clearInterval(sseKeepAliveInterval);
              logger.log('SSE connection closed, clearing keep-alive interval');
            }
          }, argv.keepAliveInterval);

          // Clean up interval if the client disconnects
          req.on('close', () => {
            clearInterval(sseKeepAliveInterval);
            logger.log('SSE connection closed by client');
          });
        }
      });

      app.post('/messages', async (req, res) => {
        if (!transport) {
          logger.log('No transport found.');
          res.status(400).send('No transport found');
          return;
        }
        await transport.handlePostMessage(req, res);
      });

      logger.log(`Nx MCP server (SSE) listening on port ${port}`);
    }

    server_instance = app.listen(port);
  } else {
    const transport = new StdioServerTransport();
    await serverWrapper.getMcpServer().connect(transport);
    mcpStdioConnected = true;

    transport.onclose = () => exitHandler('SIGINT');

    // Handle stdin close (client disconnect) - the MCP SDK doesn't detect EOF
    process.stdin.on('end', () => {
      logger.log('stdin closed, shutting down...');
      exitHandler('SIGINT');
    });
  }

  // ensure the daemon is running if possible
  // if the daemon exists, we can use it to register a change listener
  let stopWatcher: () => void | undefined;
  if (nxWorkspacePath && !argv.minimal) {
    const nxVersion = await getNxVersion(nxWorkspacePath);
    if (gte(nxVersion, '22.0.0')) {
      try {
        const daemonWatcher = new PassiveDaemonWatcher(nxWorkspacePath, logger);
        await daemonWatcher.start();
        daemonWatcher.listen(() => {
          resetStatus(nxWorkspacePath);
        });

        stopWatcher = () => {
          daemonWatcher.dispose();
        };
      } catch (e) {
        logger.log('Error setting up watcher: ' + e);
      }
    } else {
      logger.log(
        'Nx version below 22.0.0, Nx MCP will not automatically subscribe to project graph changes.',
      );
    }
  }

  // Prevent the Node.js process from exiting early
  process.on('SIGINT', () => {
    logger.log('Received SIGINT signal. Server shutting down...');
    exitHandler('SIGINT');
  });

  process.on('SIGTERM', () => {
    logger.log('Received SIGTERM signal. Server shutting down...');
    exitHandler('SIGTERM');
  });

  process.on('SIGHUP', () => {
    logger.log('Received SIGHUP signal. Server shutting down...');
    exitHandler('SIGHUP');
  });

  // Keep the process alive
  process.stdin.resume();
}

main().catch((err) => {
  consoleLogger.log('Fatal error:', err);
  process.exit(1);
});
