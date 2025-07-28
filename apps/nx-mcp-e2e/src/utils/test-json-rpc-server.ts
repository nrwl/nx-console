import { createMessageConnection } from 'vscode-jsonrpc/node';
import { createServer, Server } from 'net';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import {
  getNxConsoleSocketPath,
  killSocketOnPath,
} from '@nx-console/shared-utils';

export interface ReceivedMessage {
  method: string;
  params?: unknown;
  timestamp: number;
}

/**
 * Barebones JSON-RPC server for testing IDE communication
 */
export class TestJsonRpcServer {
  private server: Server;
  private socketPath: string;
  private receivedMessages: ReceivedMessage[] = [];
  private connections: any[] = [];

  constructor(workspacePath: string) {
    // Use the exact same socket path that the MCP server expects
    this.socketPath = getNxConsoleSocketPath(workspacePath);

    this.server = createServer((socket) => {
      const connection = createMessageConnection(socket, socket);
      this.connections.push(connection);

      // Listen for all notifications from IDE tools
      connection.onNotification('ide/focusProject', (params) => {
        this.receivedMessages.push({
          method: 'ide/focusProject',
          params,
          timestamp: Date.now(),
        });
      });

      connection.onNotification('ide/focusTask', (params) => {
        this.receivedMessages.push({
          method: 'ide/focusTask',
          params,
          timestamp: Date.now(),
        });
      });

      connection.onNotification('ide/showFullProjectGraph', (params) => {
        this.receivedMessages.push({
          method: 'ide/showFullProjectGraph',
          params,
          timestamp: Date.now(),
        });
      });

      // Handle requests from IDE tools
      connection.onRequest('ide/openGenerateUi', (params) => {
        this.receivedMessages.push({
          method: 'ide/openGenerateUi',
          params,
          timestamp: Date.now(),
        });
        // Return mock response that matches OpenGenerateUiResponse
        return { logFileName: 'test-generator.log' };
      });

      connection.listen();

      socket.on('close', () => {
        const index = this.connections.indexOf(connection);
        if (index !== -1) {
          this.connections.splice(index, 1);
        }
        connection.dispose();
      });
    });
  }

  async start(): Promise<void> {
    // Clean up existing socket using shared utility
    await killSocketOnPath(this.socketPath);

    // Ensure socket directory exists
    const socketDir = dirname(this.socketPath);
    if (!existsSync(socketDir)) {
      mkdirSync(socketDir, { recursive: true });
    }

    return new Promise((resolve) => {
      this.server.listen(this.socketPath, () => {
        resolve();
      });
    });
  }

  stop(): void {
    this.connections.forEach((conn) => conn.dispose());
    this.connections = [];

    this.server.close();

    // Use shared utility for cleanup
    killSocketOnPath(this.socketPath).catch(() => {
      // Ignore cleanup errors
    });
  }

  getReceivedMessages(): ReceivedMessage[] {
    return [...this.receivedMessages];
  }

  clearMessages(): void {
    this.receivedMessages = [];
  }

  getSocketPath(): string {
    return this.socketPath;
  }
}
