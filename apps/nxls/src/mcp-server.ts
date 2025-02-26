import { createNxMcpServer } from '@nx-console/nx-mcp-server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function startMcpServer(workspacePath: string): McpServer {
  const server = createNxMcpServer(workspacePath);

  const app = express();
  let transport: SSEServerTransport;
  app.get('/sse', async (req, res) => {
    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
  });

  app.post('/messages', async (req, res) => {
    if (!transport) {
      res.status(400).send('No transport found');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(3001);

  return server;
}
