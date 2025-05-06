import net from 'net';
import { ExtensionContext } from 'vscode';
import { getFullOsSocketPath, killSocketOrPath } from './pipe';
import { NxTerminalMessage } from './features/terminal-message';

import { createMessageConnection } from 'vscode-jsonrpc/node';
import {
  NxEndedRunningTasks,
  NxStartedRunningTasks,
  NxUpdatedRunningTasks,
} from './features/running-tasks';
import { MessagingNotification } from './messaging-notification';

const notifications: Array<MessagingNotification> = [
  NxTerminalMessage,
  NxStartedRunningTasks,
  NxEndedRunningTasks,
  NxUpdatedRunningTasks,
];

export class NxMessagingServer {
  #server: net.Server;
  #fullSocketPath: string;

  constructor(workspacePath: string) {
    killSocketOrPath(workspacePath);

    this.#fullSocketPath = getFullOsSocketPath(workspacePath);

    this.#server = net.createServer((socket) => {
      console.log(`Client connected`);

      // Create a connection for the server over this socket
      const connection = createMessageConnection(
        socket, // Use the TCP socket for communication
        socket,
      );

      notifications.forEach((notification) => {
        connection.onNotification(notification.type, notification.handler);
      });

      connection.listen();

      socket.on('close', () => {
        connection.dispose();
        console.log('Client disconnected');
      });
    });
  }

  listen() {
    this.#server.listen(this.#fullSocketPath, () => {
      console.log(
        `Nx Console Messaging JSON-RPC server listening on ${this.#fullSocketPath}`,
      );
    });
  }

  dispose() {
    try {
      this.#server.close(() => {
        console.log(
          `Nx Console Messaging JSON-RPC server closed on ${this.#fullSocketPath}`,
        );
      });
    } catch (error) {
      console.error('Error closing server:', error);
    }
  }
}

let existingServer: NxMessagingServer | null = null;

export function initMessagingServer(
  context: ExtensionContext,
  workspacePath: string,
) {
  if (existingServer) {
    existingServer.dispose();
  }

  const messagingServer = new NxMessagingServer(workspacePath);
  messagingServer.listen();

  context.subscriptions.push(messagingServer);

  existingServer = messagingServer;
}
