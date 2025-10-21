import {
  getNxConsoleSocketPath,
  killSocketOnPath,
} from '@nx-console/shared-socket-utils';
import net from 'net';
import { ExtensionContext } from 'vscode';
import { NxTerminalMessage } from './features/terminal-message';

import crypto from 'crypto';
import { createMessageConnection } from 'vscode-jsonrpc/node';
import {
  IdeFocusProject,
  IdeFocusTask,
  IdeGetRunningTasks,
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
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { loadRootEnvFiles } from '@nx-console/shared-utils';

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
  IdeGetRunningTasks,
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

  async listen() {
    killSocketOnPath(this.#fullSocketPath);
    await new Promise<void>((resolve, reject) => {
      const onListening = () => {
        this.#server.off('error', onError);
        vscodeLogger.log(
          `Nx Console Messaging JSON-RPC server listening on ${this.#fullSocketPath}`,
        );
        resolve();
      };

      const onError = (err: NodeJS.ErrnoException) => {
        this.#server.off('listening', onListening);

        reject(err);
      };

      this.#server.once('listening', onListening);
      this.#server.once('error', onError);
      this.#server.listen(this.#fullSocketPath);
    });
  }

  async dispose() {
    try {
      vscodeLogger.log(`closing server on ${this.#fullSocketPath}`);
      await new Promise<void>((resolve) => {
        this.#server.close(() => {
          vscodeLogger.log(
            `Nx Console Messaging JSON-RPC server closed on ${this.#fullSocketPath}`,
          );
          resolve();
        });
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
      await existingServer.dispose();
    }

    const envWithLocalFiles = loadRootEnvFiles(workspacePath, {
      ...process.env,
    });

    const socketPath = await getNxConsoleSocketPath(
      workspacePath,
      envWithLocalFiles,
    );

    const messagingServer = new NxMessagingServer(socketPath, context);
    await messagingServer.listen();

    context.subscriptions.push(messagingServer);

    existingServer = messagingServer;
  } catch (e) {
    vscodeLogger.log(
      `Error initializing Nx Console JSON-RPC messaging server: ${e}`,
    );
    if ((e as any).code === 'EACCES') {
      vscodeLogger.log(
        'The socket path is not accessible. You can overwrite it by setting NX_SOCKET_DIR in .env',
      );
    }
  }
}
