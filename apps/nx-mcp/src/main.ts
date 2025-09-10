import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  IdeProvider,
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { isNxCloudUsed, getRecentCIPEData } from '@nx-console/shared-nx-cloud';
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
import { DaemonWatcher } from '@nx-console/shared-watcher';
import { randomUUID } from 'crypto';
import express from 'express';
import { resolve } from 'path';
import { hideBin } from 'yargs/helpers';
import { ensureOnlyJsonRpcStdout } from './ensureOnlyJsonRpcStdout';
import { createIdeClient } from './ide-client/create-ide-client';
import { getPackageVersion } from './utils';
import { ArgvType, createYargsConfig } from './yargs-config';
import { IncomingMessage, Server, ServerResponse } from 'http';

async function main() {
  const argv = createYargsConfig(hideBin(process.argv)).parseSync() as ArgvType;

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

  let mcpStdioConnected = false;
  let logger: { log: (message: string) => void } = consoleLogger;

  if (argv.transport === 'stdio') {
    logger = {
      log: (message: string) => {
        if (mcpStdioConnected) {
          mcpServer.server.sendLoggingMessage({
            level: 'info',
            message,
          });
        } else {
          // do nothing
        }
      },
    };
    ensureOnlyJsonRpcStdout();
  }

  logger.log('Starting Nx MCP server');

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
    getRecentCIPEData: async (workspacePath, logger) =>
      await getRecentCIPEData(workspacePath, logger),
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
        openGenerateUi: async (
          generatorName: string,
          options: Record<string, unknown>,
          cwd?: string,
        ) => {
          if (!ideClient) throw new Error('No IDE client available');
          return await ideClient.openGenerateUi(generatorName, options, cwd);
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
      // Streamable HTTP mode
      const connections = new Set<{
        transport: StreamableHTTPServerTransport;
        server: NxMcpServerWrapper;
      }>();

      app.use(express.json());

      // Streamable HTTP endpoint
      app.all('/mcp', async (req, res) => {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        const connectionServer = await NxMcpServerWrapper.create(
          nxWorkspacePath,
          nxWorkspaceInfoProvider,
          mcpServer,
          ideProvider,
          telemetryLogger,
          logger,
        );
        const connection = { transport, server: connectionServer };
        connections.add(connection);

        // Clean up on connection close
        res.on('close', () => {
          connections.delete(connection);
          connectionServer.cleanup();
          connectionServer.getMcpServer().close();
          logger.log('Streamable HTTP connection closed');
        });

        await connectionServer.getMcpServer().connect(transport);
        await transport.handleRequest(req, res, req.body);
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
  }

  // ensure the daemon is running if possible
  // if the daemon exists, we can use it to register a change listener
  let stopWatcher: () => void | undefined;
  if (nxWorkspacePath) {
    try {
      const daemonWatcher = new DaemonWatcher(
        nxWorkspacePath,
        await getNxVersion(nxWorkspacePath),
        () => {
          resetStatus(nxWorkspacePath);
        },
        logger,
      );
      // Start the daemon watcher asynchronously to avoid blocking MCP startup
      daemonWatcher.start().catch((e) => {
        logger.log('Error starting daemon watcher: ' + e);
      });
      stopWatcher = () => {
        daemonWatcher.stop();
      };
    } catch (e) {
      logger.log('Error setting up watcher: ' + e);
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

  // Keep the process alive
  process.stdin.resume();
}

main().catch((err) => {
  consoleLogger.log('Fatal error:', err);
  process.exit(1);
});
