import { createNxMcpServer } from '@nx-console/nx-mcp-server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
export function startMcpServer(workspacePath: string) {
  const server = createNxMcpServer(workspacePath);

  const transport = new SSEServerTransport();

  return server;
}
