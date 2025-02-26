import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GoogleAnalytics } from '@nx-console/shared-telemetry';
import { randomUUID } from 'crypto';
import { NxMcpServerWrapper } from '@nx-console/nx-mcp-server';

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

const server = new NxMcpServerWrapper(nxWorkspacePath, googleAnalytics);

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
