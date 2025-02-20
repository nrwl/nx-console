import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { checkIsNxWorkspace } from '@nx-console/shared-npm';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { getProjectGraphPrompt } from '@nx-console/shared-prompts';
import { getMcpLogger } from './mcp-logger';

const nxWorkspacePath = process.argv[2];
if (!nxWorkspacePath) {
  console.error('Please provide a workspace root as the first argument');
  process.exit(1);
}

const server = new McpServer({
  name: 'Nx MCP',
  version: '0.0.1',
});
server.server.registerCapabilities({
  logging: {},
});
const logger = getMcpLogger(server);

server.tool(
  'nx-project-graph',
  'Returns a readable representation of the nx project graph. Use it to answer questions about the nx workspace and architecture',
  async () => {
    try {
      if (!(await checkIsNxWorkspace(nxWorkspacePath))) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Error: The provided root is not a valid nx workspace.',
            },
          ],
        };
      }

      const workspace = await nxWorkspace(nxWorkspacePath, logger);
      return {
        content: [
          {
            type: 'text',
            text: getProjectGraphPrompt(workspace.projectGraph),
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: String(e) }],
      };
    }
  },
);

const transport = new StdioServerTransport();
server.connect(transport);
