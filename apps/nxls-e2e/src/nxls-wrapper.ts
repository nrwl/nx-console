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
  private pendingNotificationMap = new Map<
    string,
    (params: object | any[] | undefined) => void
  >();

  constructor(private verbose?: boolean) {
    if (verbose === undefined) {
      this.verbose = !!process.env['CI'];
    }
  }

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
        windowsHide: true,
      });

      this.messageReader = new StreamMessageReader(p.stdout);
      this.messageWriter = new StreamMessageWriter(p.stdin);

      console.log('process', p);

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

    // make sure nothing can write to stdin anymore after we destroy the stream
    // this fixes an issue where a leftover 'Content Length' header would be written to the stdin
    // during the nxls shutdown sequence
    if (this.process?.stdin) {
      this.process.stdin.write = (chunk: any, cb: any) => {
        return true;
      };
    }

    this.process?.stdout?.destroy();
    this.process?.stderr?.destroy();
    this.process?.stdin?.destroy();

    await new Promise<void>((resolve) => {
      if (this.process?.pid) {
        treeKill(this.process.pid, 'SIGKILL', () => resolve());
      } else {
        resolve();
      }
    });
  }

  async sendRequest(
    request: Omit<RequestMessage, 'jsonrpc' | 'id'>
  ): Promise<ResponseMessage> {
    let timeout: NodeJS.Timeout;
    return await new Promise<ResponseMessage>((resolve, reject) => {
      // Set a timeout for 2 minutes
      timeout = setTimeout(() => {
        this.pendingRequestMap.delete(id);
        reject(new Error(`Request ${request.method} timed out`));
      }, 2 * 60 * 1000);

      const id = this.idCounter++;
      this.pendingRequestMap.set(id, resolve);

      const fullRequest = {
        jsonrpc: '2.0',
        id,
        ...request,
      } as Message;
      if (this.verbose) {
        console.log(
          'sending request',
          JSON.stringify(fullRequest, null, 2),
          `at ${new Date().toISOString()}`
        );
      }
      this.messageWriter?.write(fullRequest);
    }).finally(() => {
      clearTimeout(timeout);
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

  async waitForNotification(
    method: string
  ): Promise<object | any[] | undefined> {
    return await new Promise<any>((resolve) => {
      this.pendingNotificationMap.set(method, resolve);
    });
  }

  setVerbose(verbose: boolean) {
    this.verbose = verbose;
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
      } else if (isNotificationMessage(message)) {
        const method = message.method;
        const resolve = this.pendingNotificationMap.get(method);
        if (resolve) {
          resolve(message.params);
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
