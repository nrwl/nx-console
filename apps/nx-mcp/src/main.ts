import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  GoogleAnalytics,
  NxConsoleTelemetryLogger,
} from '@nx-console/shared-telemetry';
import { randomUUID } from 'crypto';
import {
  NxMcpServerWrapper,
  NxWorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import {
  nxWorkspace,
  getGenerators,
} from '@nx-console/shared-nx-workspace-info';

const nxWorkspacePath = process.argv[2];
if (!nxWorkspacePath) {
  console.error('Please provide a workspace root as the first argument');
  process.exit(1);
}

const clientId = randomUUID();
const googleAnalytics = new GoogleAnalytics(
  'production',
  clientId,
  clientId,
  clientId,
  getPackageVersion(),
  'nx-mcp',
);

const telemetryLogger: NxConsoleTelemetryLogger = {
  logUsage: (eventName, data) => {
    googleAnalytics.sendEventData(eventName, data);
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

const transport = new StdioServerTransport();
server.getMcpServer().connect(transport);

function getPackageVersion() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./package.json').version;
  } catch {
    return '0.0.0';
  }
}
