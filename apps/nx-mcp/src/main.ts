import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import {
  getGenerators,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';
import {
  GoogleAnalytics,
  NxConsoleTelemetryLogger,
} from '@nx-console/shared-telemetry';
import { randomUUID } from 'crypto';
import { hideBin } from 'yargs/helpers';
import express from 'express';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { resolve } from 'path';
import { createYargsConfig, ArgvType } from './yargs-config';

async function main() {
  const argv = createYargsConfig(hideBin(process.argv)).parseSync() as ArgvType;

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

  const server = await NxMcpServerWrapper.create(
    nxWorkspacePath,
    nxWorkspaceInfoProvider,
    undefined,
    telemetryLogger,
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

        // Create a new server instance for this connection
        const connectionServer = await NxMcpServerWrapper.create(
          nxWorkspacePath,
          nxWorkspaceInfoProvider,
          undefined,
          telemetryLogger,
        );
        const connection = { transport, server: connectionServer };
        connections.add(connection);

        // Clean up on connection close
        res.on('close', () => {
          connections.delete(connection);
          connectionServer.getMcpServer().close();
          console.log('Streamable HTTP connection closed');
        });

        await connectionServer.getMcpServer().connect(transport);
        await transport.handleRequest(req, res, req.body);
      });

      console.log(`Nx MCP server (Streamable HTTP) listening on port ${port}`);
    } else {
      // SSE mode
      let transport: SSEServerTransport;
      app.get('/sse', async (req, res) => {
        console.log('Configuring SSE transport');
        transport = new SSEServerTransport('/messages', res);
        await server.getMcpServer().connect(transport);

        // Set up keep-alive interval if enabled
        if (argv.keepAliveInterval > 0) {
          const keepAliveInterval = setInterval(() => {
            // Check if the connection is still open using the socket's writable state
            if (!res.writableEnded && !res.writableFinished) {
              res.write(':beat\n\n');
            } else {
              clearInterval(keepAliveInterval);
              console.log(
                'SSE connection closed, clearing keep-alive interval',
              );
            }
          }, argv.keepAliveInterval);

          // Clean up interval if the client disconnects
          req.on('close', () => {
            clearInterval(keepAliveInterval);
            console.log('SSE connection closed by client');
          });
        }
      });

      app.post('/messages', async (req, res) => {
        if (!transport) {
          console.log('No transport found.');
          res.status(400).send('No transport found');
          return;
        }
        await transport.handlePostMessage(req, res);
      });

      console.log(`Nx MCP server (SSE) listening on port ${port}`);
    }

    const server_instance = app.listen(port);

    process.on('exit', () => {
      server_instance.close();
    });
  } else {
    const transport = new StdioServerTransport();
    server.getMcpServer().connect(transport);
  }

  function getPackageVersion() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./package.json').version;
    } catch {
      return '0.0.0';
    }
  }

  // Prevent the Node.js process from exiting early
  process.on('SIGINT', () => {
    console.log('Received SIGINT signal. Server shutting down...');
    process.exit(0);
  });

  // Keep the process alive
  process.stdin.resume();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
