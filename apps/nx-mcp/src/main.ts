import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createNxMcpServer,
  WorkspaceInfoProvider,
} from '@nx-console/nx-mcp-server';
import {
  getGenerators,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';
import { GoogleAnalytics } from '@nx-console/shared-telemetry';
import { randomUUID } from 'crypto';

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

const workspaceInfoProvider: WorkspaceInfoProvider = {
  nxWorkspace,
  getGenerators,
};

const server = createNxMcpServer(
  nxWorkspacePath,
  workspaceInfoProvider,
  googleAnalytics,
);

const transport = new StdioServerTransport();
server.connect(transport);

function getPackageVersion() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./package.json').version;
  } catch {
    return '0.0.0';
  }
}
