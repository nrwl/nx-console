import net from 'net';
import { ExtensionContext } from 'vscode';
import { getFullOsSocketPath, killSocketOnPath } from './pipe';
import { NxTerminalMessage } from './features/terminal-message';

import { createMessageConnection } from 'vscode-jsonrpc/node';
import {
  NxEndedRunningTasks,
  NxStartedRunningTasks,
  NxUpdatedRunningTasks,
} from './features/running-tasks';
import {
  MessagingNotification,
  MessagingNotification2,
} from './messaging-notification';
import crypto from 'crypto';
import { vscodeLogger } from '@nx-console/vscode-utils';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { gte } from '@nx-console/nx-version';

const messages: Array<MessagingNotification | MessagingNotification2> = [
  NxTerminalMessage,
  NxStartedRunningTasks,
  NxEndedRunningTasks,
  NxUpdatedRunningTasks,
];

export class NxMessagingServer {
  #server: net.Server;
  #fullSocketPath: string;

  constructor(socketPath: string) {
    this.#fullSocketPath = socketPath;
    this.#server = net.createServer((socket) => {
      const socketId = crypto.randomUUID().toString();
      (socket as any).__socketId = socketId;
      vscodeLogger.log(`Client connected: ${socketId}`);

      const connection = createMessageConnection(socket, socket);

      messages.forEach((notification) => {
        if ('type' in notification) {
          connection.onNotification(
            notification.type.method,
            notification.handler(socketId),
          );
        }
      });

      connection.listen();

      socket.on('close', () => {
        connection.dispose();
        vscodeLogger.log(`Client disconnected: ${socketId}`);
        messages.forEach((messageHandler) => {
          messageHandler.onClose?.(socketId);
        });
      });
    });
  }

  listen() {
    killSocketOnPath(this.#fullSocketPath);
    this.#server.listen(this.#fullSocketPath, () => {
      vscodeLogger.log(
        `Nx Console Messaging JSON-RPC server listening on ${this.#fullSocketPath}`,
      );
    });
  }

  dispose() {
    try {
      this.#server.close(() => {
        vscodeLogger.log(
          `Nx Console Messaging JSON-RPC server closed on ${this.#fullSocketPath}`,
        );
      });
    } catch (error) {
      vscodeLogger.log('Error closing server:', error);
    }
  }
}

let existingServer: NxMessagingServer | null = null;

export async function initMessagingServer(
  context: ExtensionContext,
  workspacePath: string,
) {
  if (existingServer) {
    existingServer.dispose();
  }

  const version = await getNxVersion();
  if (!version || !gte(version, '21.1.0-beta.1')) {
    return;
  }

  const socketPath = await getFullOsSocketPath(workspacePath);
  const messagingServer = new NxMessagingServer(socketPath);
  await messagingServer.listen();

  context.subscriptions.push(messagingServer);

  existingServer = messagingServer;
}
