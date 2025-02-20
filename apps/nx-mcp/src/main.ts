import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'Nx MCP',
  version: '0.0.1',
});

server.tool(
  'project-graph',
  'Returns a readable representation of the nx project graph and global nx configuration. Use it to answer questions about the nx workspace and architecture',
  async () => {
    const roots = await server.server.listRoots();
    return {
      content: [{ type: 'text', text: String(roots.roots.join(', ')) }],
    };
  },
);

const transport = new StdioServerTransport();
server.connect(transport);
