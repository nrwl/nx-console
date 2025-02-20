import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'Nx MCP',
  version: '0.0.1',
});

server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: 'text', text: String(a + b) }],
}));

server.prompt('review-code', { code: z.string() }, ({ code }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Please review this code:\n\n${code}`,
      },
    },
  ],
}));

const transport = new StdioServerTransport();
server.connect(transport);
