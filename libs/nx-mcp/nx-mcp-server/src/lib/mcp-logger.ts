import { McpServer } from '@modelcontextprotocol/server';
import { Logger } from '@nx-console/shared-utils';

export function getMcpLogger(
  server: McpServer,
  enableDebugLogging = false,
): Logger {
  return {
    log: (message: string) => {
      server.server.sendLoggingMessage({
        level: 'info',
        data: message,
      });
    },
    debug: (message: string) => {
      if (enableDebugLogging) {
        server.server.sendLoggingMessage({
          level: 'info',
          data: message,
        });
      }
    },
  };
}
