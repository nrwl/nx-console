import {
  getNxConsoleSocketPath,
  killSocketOnPath,
} from '@nx-console/shared-utils';
import net from 'net';
import { ExtensionContext } from 'vscode';
import { NxTerminalMessage } from './features/terminal-message';

import { vscodeLogger } from '@nx-console/vscode-utils';
import crypto from 'crypto';
import { createMessageConnection } from 'vscode-jsonrpc/node';
import {
  IdeFocusProject,
  IdeFocusTask,
  IdeOpenGenerateUi,
  IdeShowFullProjectGraph,
} from './features/ide-requests';
import {
  NxEndedRunningTasks,
  NxStartedRunningTasks,
  NxUpdatedRunningTasks,
} from './features/running-tasks';
import {
  MessagingNotification,
  MessagingNotification2,
  MessagingRequest,
  MessagingRequest0,
} from './messaging-notification';

const messages: Array<MessagingNotification | MessagingNotification2> = [
  NxTerminalMessage,
  NxStartedRunningTasks,
  NxEndedRunningTasks,
  NxUpdatedRunningTasks,
  IdeFocusProject,
  IdeFocusTask,
  IdeShowFullProjectGraph,
];

const requests: Array<MessagingRequest<any, any> | MessagingRequest0<any>> = [
  IdeOpenGenerateUi,
];

export class NxMessagingServer {
  #server: net.Server;
  #fullSocketPath: string;
  #context: ExtensionContext;

  constructor(socketPath: string, context: ExtensionContext) {
    this.#fullSocketPath = socketPath;
    this.#context = context;

    this.#server = net.createServer((socket) => {
      const socketId = crypto.randomUUID().toString();
      (socket as any).__socketId = socketId;
      vscodeLogger.log(`Client connected: ${socketId}`);

      const connection = createMessageConnection(socket, socket);

      // Register notification handlers
      messages.forEach((notification) => {
        if ('type' in notification) {
          connection.onNotification(
            notification.type.method,
            notification.handler(socketId),
          );
        }
      });

      // Register request handlers
      requests.forEach((request) => {
        if ('type' in request) {
          connection.onRequest(request.type.method, request.handler(socketId));
        }
      });

      connection.listen();

      socket.on('close', () => {
        connection.dispose();
        vscodeLogger.log(`Client disconnected: ${socketId}`);

        // Call onClose for both messages and requests
        messages.forEach((messageHandler) => {
          messageHandler.onClose?.(socketId);
        });
        requests.forEach((requestHandler) => {
          requestHandler.onClose?.(socketId);
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
  try {
    if (existingServer) {
      existingServer.dispose();
    }

    const socketPath = getNxConsoleSocketPath(workspacePath);
    const messagingServer = new NxMessagingServer(socketPath, context);
    messagingServer.listen();

    context.subscriptions.push(messagingServer);

    existingServer = messagingServer;
  } catch (e) {
    vscodeLogger.log(
      `Error initializing Nx Console JSON-RPC messaging server: ${e}`,
    );
  }
}
