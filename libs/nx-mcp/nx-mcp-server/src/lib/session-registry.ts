import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * Global registry of active MCP sessions.
 * Maps session IDs to their corresponding transport instances.
 */
export const sessions: Record<string, StreamableHTTPServerTransport> =
  Object.create(null);
