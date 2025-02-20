import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nx-console/shared-utils';

export function getMcpLogger(server: McpServer): Logger {
  return {
    log: (message: string) => {
      server.server.sendLoggingMessage({
        level: 'info',
        data: message,
      });
    },
  };
}
