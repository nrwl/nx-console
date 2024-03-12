import { ChildProcess, spawn } from 'child_process';
import { join } from 'path';
import {
  Message,
  NotificationMessage,
  RequestMessage,
  ResponseMessage,
} from 'vscode-jsonrpc';
import {
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-languageserver/node';

import treeKill from 'tree-kill';

export class NxlsWrapper {
  private messageReader?: StreamMessageReader;
  private messageWriter?: StreamMessageWriter;
  private process?: ChildProcess;
  private readerDisposable?: { dispose: () => void };
  private readerErrorDisposable?: { dispose: () => void };
  private pendingRequestMap = new Map<
    number,
    (message: ResponseMessage) => void
  >();

  constructor(private verbose = false) {}

  private idCounter = 1;

  async startNxls(cwd: string) {
    try {
      const nxlsPath = join(
        __dirname,
        '..',
        '..',
        '..',
        'dist',
        'apps',
        'nxls',
        'main.js'
      );

      const p = spawn('node', [nxlsPath, '--stdio'], {
        env: process.env,
        cwd,
      });

      this.messageReader = new StreamMessageReader(p.stdout);
      this.messageWriter = new StreamMessageWriter(p.stdin);

      this.listenToLSPMessages(this.messageReader);

      await this.sendRequest({
        method: 'initialize',
        params: {
          processId: p.pid,
          rootUri: null,
          capabilities: {},
          initializationOptions: {
            workspacePath: cwd,
          },
        },
      });

      if (this.verbose) {
        console.log(`started nxls with pid ${p.pid}`);
      }

      this.process = p;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async stopNxls() {
    await this.sendRequest({
      method: 'shutdown',
    });
    this.sendNotification({ method: 'exit' });

    this.readerDisposable?.dispose();
    this.readerErrorDisposable?.dispose();
    this.messageReader?.dispose();
    this.messageWriter?.dispose();

    await Promise.all([
      new Promise<void>((resolve) => {
        this.process?.on('exit', () => {
          this.process?.stdout?.destroy();
          this.process?.stderr?.destroy();
          this.process?.stdin?.destroy();
          console.log('process exit called');
          resolve();
        });
      }),
      new Promise((resolve) => {
        if (this.process?.pid) {
          treeKill(this.process.pid, 0, resolve);
        }
      }).then(() => console.log('treekill resolved')),
    ]);
  }

  async sendRequest(
    request: Omit<RequestMessage, 'jsonrpc' | 'id'>
  ): Promise<ResponseMessage> {
    return await new Promise<ResponseMessage>((resolve) => {
      const id = this.idCounter++;
      this.pendingRequestMap.set(id, resolve);

      const fullRequest = {
        jsonrpc: '2.0',
        id,
        ...request,
      } as Message;
      if (this.verbose) {
        console.log('sending request', JSON.stringify(fullRequest, null, 2));
      }
      this.messageWriter?.write(fullRequest);
    });
  }

  sendNotification(notification: Omit<NotificationMessage, 'jsonrpc'>) {
    if (this.verbose) {
      console.log(
        'sending notification',
        JSON.stringify(notification, null, 2)
      );
    }
    this.messageWriter?.write({
      jsonrpc: '2.0',
      ...notification,
    } as Message);
  }

  private listenToLSPMessages(messageReader: StreamMessageReader) {
    this.readerDisposable = messageReader.listen((message) => {
      if (
        isNotificationMessage(message) &&
        message.method === 'window/logMessage'
      ) {
        if (this.verbose) {
          console.log((message.params as any)?.message);
        }
        return;
      }
      if (this.verbose) {
        console.log('received message', JSON.stringify(message, null, 2));
      }

      if (isResponseMessage(message) && typeof message.id === 'number') {
        const resolve = this.pendingRequestMap.get(message.id);
        if (resolve) {
          resolve(message);
          this.pendingRequestMap.delete(message.id);
        }
      }
    });

    this.readerErrorDisposable = messageReader.onError((error) => {
      console.error('ERROR: ', error);
    });
  }
}

function isNotificationMessage(
  message: Message
): message is NotificationMessage {
  return !('id' in message);
}

function isResponseMessage(message: Message): message is ResponseMessage {
  return 'result' in message || 'error' in message;
}

function isRequestMessage(message: Message): message is RequestMessage {
  return !isNotificationMessage(message) && !isResponseMessage(message);
}
