import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import express from 'express';

interface ArgvType {
  workspacePath?: string;
  sse: boolean;
  port?: number;
  disableTelemetry: boolean;
  _: (string | number)[];
  $0: string;
  [x: string]: unknown;
}

const argv = yargs(hideBin(process.argv))
  .command('$0 [workspacePath]', 'Start the nx-mcp server', (yargs) => {
    yargs.positional('workspacePath', {
      describe: 'Path to the Nx workspace root',
      type: 'string',
    });
  })
  .option('workspacePath', {
    alias: 'w',
    describe: 'Path to the Nx workspace root',
    type: 'string',
  })
  .option('sse', {
    describe: 'Configure the server to use SSE (Server-Sent Events)',
    type: 'boolean',
    default: false,
  })
  .option('port', {
    alias: 'p',
    describe: 'Port to use for the SSE server (default: 9921)',
    type: 'number',
  })
  .option('disableTelemetry', {
    describe: 'Disable sending of telemetry data',
    type: 'boolean',
    default: false,
  })
  .check((argv) => {
    if (argv.port !== undefined && !argv.sse) {
      throw new Error(
        'The --port option can only be used when --sse is enabled',
      );
    }
    return true;
  })
  .help()
  .parseSync() as ArgvType;

const nxWorkspacePath = argv.workspacePath || (argv._[0] as string);
if (!nxWorkspacePath) {
  console.error(
    'Please provide a workspace root as the first argument or with --workspacePath',
  );
  process.exit(1);
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
};

const server = new NxMcpServerWrapper(
  nxWorkspacePath,
  nxWorkspaceInfoProvider,
  undefined,
  telemetryLogger,
);

if (argv.sse) {
  const app = express();
  let transport: SSEServerTransport;
  app.get('/sse', async (req, res) => {
    console.log('Configuring SSE transport');
    transport = new SSEServerTransport('/messages', res);
    await server.getMcpServer().connect(transport);
  });

  app.post('/messages', async (req, res) => {
    if (!transport) {
      console.log('No transport found.');
      res.status(400).send('No transport found');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  const server_instance = app.listen(argv.port ?? 9921);

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
