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
    [(message: ResponseMessage) => void, NodeJS.Timeout]
  >();
  private pendingNotificationMap = new Map<
    string,
    [(params: object | any[] | undefined) => void, NodeJS.Timeout]
  >();
  private earlyExitListener = (code: number) => {
    console.log(`nxls exited with code ${code}`);
    console.log(`nxls stderr: ${this.process?.stderr?.read()}`);
  };

  constructor(private verbose?: boolean) {
    if (verbose === undefined) {
      this.verbose = !!process.env['CI'] || !!process.env['NX_VERBOSE_LOGGING'];
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

      p.on('exit', this.earlyExitListener);

      this.messageReader = new StreamMessageReader(p.stdout);
      this.messageWriter = new StreamMessageWriter(p.stdin);

      this.listenToLSPMessages(this.messageReader);

      await this.sendRequest(
        {
          method: 'initialize',
          params: {
            processId: p.pid,
            rootUri: null,
            capabilities: {},
            initializationOptions: {
              workspacePath: cwd,
            },
          },
        },
        10
      );

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

    this.pendingNotificationMap.forEach(([res, timeout]) => {
      res(new Error('nxls stopped'));
      clearTimeout(timeout);
    });
    this.pendingRequestMap.forEach(([res, timeout], key) => {
      res({
        jsonrpc: '2.0',
        id: key,
        error: {
          code: -32000,
          message: 'nxls stopped',
        },
      });
      clearTimeout(timeout);
    });

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

    this.process?.removeListener('exit', this.earlyExitListener);

    await new Promise<void>((resolve) => {
      if (this.process?.pid) {
        treeKill(this.process.pid, 'SIGKILL', () => resolve());
      } else {
        resolve();
      }
    });
  }

  async sendRequest(
    request: Omit<RequestMessage, 'jsonrpc' | 'id'>,
    customTimeoutMinutes?: number
  ): Promise<ResponseMessage> {
    let timeout: NodeJS.Timeout;
    return await new Promise<ResponseMessage>((resolve, reject) => {
      timeout = setTimeout(() => {
        this.pendingRequestMap.delete(id);
        reject(
          new Error(
            `Request ${request.method} timed out at ${new Date().toISOString()}`
          )
        );
      }, (customTimeoutMinutes ?? 3) * 60 * 1000);

      const id = this.idCounter++;
      this.pendingRequestMap.set(id, [resolve, timeout]);

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
    let timeout: NodeJS.Timeout;
    if (this.verbose) {
      console.log(`waiting for ${method}`, this.pendingNotificationMap);
    }
    return await new Promise<any>((resolve, reject) => {
      timeout = setTimeout(() => {
        this.pendingNotificationMap.delete(method);
        reject(new Error(`Timed out while waiting for ${method}`));
      }, 3 * 60 * 1000);

      this.pendingNotificationMap.set(method, [resolve, timeout]);
    }).finally(() => {
      clearTimeout(timeout);
    });
  }

  cancelWaitingForNotification(method: string) {
    const [, timeout] = this.pendingNotificationMap.get(method) ?? [];
    this.pendingNotificationMap.delete(method);
    clearTimeout(timeout);
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
        const requestAndTimeout = this.pendingRequestMap.get(message.id);
        if (requestAndTimeout) {
          const [resolve, timeout] = requestAndTimeout;
          resolve(message);
          clearTimeout(timeout);
          this.pendingRequestMap.delete(message.id);
        }
      } else if (isNotificationMessage(message)) {
        const method = message.method;
        if (this.verbose) {
          console.log('received notification', method);
          console.log('pending notifications', this.pendingNotificationMap);
        }
        const [resolve, timeout] =
          this.pendingNotificationMap.get(method) ?? [];
        if (resolve) {
          resolve(message.params);
          this.pendingNotificationMap.delete(method);
        }
        if (timeout) {
          clearTimeout(timeout);
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
