import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import {
  checkIsNxWorkspace,
  getPackageManagerCommand,
} from '@nx-console/shared-npm';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import {
  getGenerators,
  getNxDaemonClient,
  getNxVersion,
  nxWorkspace,
  resetStatus,
} from '@nx-console/shared-nx-workspace-info';
import {
  GoogleAnalytics,
  NxConsoleTelemetryLogger,
} from '@nx-console/shared-telemetry';
import { IIdeJsonRpcClient } from '@nx-console/shared-types';
import { consoleLogger, killGroup } from '@nx-console/shared-utils';
import { randomUUID } from 'crypto';
import express from 'express';
import { resolve } from 'path';
import { hideBin } from 'yargs/helpers';
import { ensureOnlyJsonRpcStdout } from './ensureOnlyJsonRpcStdout';
import { createIdeClient } from './ide-client/create-ide-client';
import { ArgvType, createYargsConfig } from './yargs-config';
import { getPackageVersion } from './utils';
import { execSync } from 'child_process';
import { DaemonWatcher } from '@nx-console/shared-watcher';

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
  const ideProvider = ideClient
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
          const keepAliveInterval = setInterval(() => {
            // Check if the connection is still open using the socket's writable state
            if (!res.writableEnded && !res.writableFinished) {
              res.write(':beat\n\n');
            } else {
              clearInterval(keepAliveInterval);
              logger.log('SSE connection closed, clearing keep-alive interval');
            }
          }, argv.keepAliveInterval);

          // Clean up interval if the client disconnects
          req.on('close', () => {
            clearInterval(keepAliveInterval);
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

    const server_instance = app.listen(port);

    process.on('exit', () => {
      server_instance.close();
    });
  } else {
    const transport = new StdioServerTransport();
    await serverWrapper.getMcpServer().connect(transport);
    mcpStdioConnected = true;
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
      await daemonWatcher.start();
      stopWatcher = () => {
        daemonWatcher.stop();
      };
    } catch (e) {
      logger.log('Error setting up watcher: ' + e);
    }
  }

  const exitHandler = () => {
    stopWatcher?.();
    process.stdin.destroy();

    if (process.connected) {
      process.disconnect();
    }
    serverWrapper.cleanup();
    killGroup(process.pid);
  };

  // Prevent the Node.js process from exiting early
  process.on('SIGINT', () => {
    logger.log('Received SIGINT signal. Server shutting down...');
    exitHandler();
  });

  // Cleanup on exit
  process.on('exit', exitHandler);

  // Keep the process alive
  process.stdin.resume();
}

main().catch((err) => {
  consoleLogger.log('Fatal error:', err);
  process.exit(1);
});
