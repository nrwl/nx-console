import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { lspLogger } from '@nx-console/language-server-utils';
import { NxMcpServerWrapper } from '@nx-console/nx-mcp-server';
import express from 'express';

export interface McpServerReturn {
  server: NxMcpServerWrapper;
  app: express.Application;
  server_instance: ReturnType<express.Application['listen']>;
}

export function startMcpServer(workspacePath: string): McpServerReturn {
  const server = new NxMcpServerWrapper(workspacePath, undefined, lspLogger);

  const app = express();
  let transport: SSEServerTransport;
  app.get('/sse', async (req, res) => {
    lspLogger.log('SSE connection established');
    transport = new SSEServerTransport('/messages', res);
    await server.getMcpServer().connect(transport);
  });

  app.post('/messages', async (req, res) => {
    if (!transport) {
      res.status(400).send('No transport found');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  const server_instance = app.listen(3001);
  lspLogger.log('MCP server started on port 3001');

  return { server, app, server_instance };
}
