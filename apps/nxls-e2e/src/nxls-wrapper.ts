import { defaultVersion } from '@nx-console/shared-e2e-utils';
import { killGroup } from '@nx-console/shared-utils';
import { ChildProcess, execSync, spawn } from 'child_process';
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

export class NxlsWrapper {
  private cwd?: string;
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
  private isShuttingDown = false;
  private earlyExitListener = (code: number) => {
    if (!this.isShuttingDown) {
      console.log(`nxls exited unexpectedly with code ${code}`);
      console.log(`nxls stderr: ${this.process?.stderr?.read()}`);
    }
  };

  constructor(
    private verbose?: boolean,
    private env?: NodeJS.ProcessEnv,
    private disableFileWatching = true,
  ) {
    if (verbose === undefined) {
      this.verbose = !!process.env['CI'] || !!process.env['NX_VERBOSE_LOGGING'];
    }
  }

  private idCounter = 1;

  async startNxls(cwd: string) {
    this.cwd = cwd;
    try {
      const nxlsPath = join(
        __dirname,
        '..',
        '..',
        '..',
        'dist',
        'apps',
        'nxls',
        'main.js',
      );

      const p = spawn('node', [nxlsPath, '--stdio'], {
        env: this.env ?? process.env,
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
              disableFileWatching: this.disableFileWatching,
            },
          },
        },
        10,
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

  async stopNxls(version?: string) {
    this.isShuttingDown = true;

    try {
      await this.sendRequest({
        method: 'shutdown',
      });
    } catch (e) {
      if (this.verbose) {
        console.log('Error sending shutdown request:', e);
      }
    }

    try {
      this.sendNotification({ method: 'exit' });
    } catch (e) {
      if (this.verbose) {
        console.log('Error sending exit notification:', e);
      }
    }

    // Clear all pending operations
    this.pendingNotificationMap.forEach(([res, timeout]) => {
      clearTimeout(timeout);
      res(undefined);
    });
    this.pendingNotificationMap.clear();

    this.pendingRequestMap.forEach(([res, timeout], key) => {
      clearTimeout(timeout);
      res({
        jsonrpc: '2.0',
        id: key,
        error: {
          code: -32000,
          message: 'nxls stopped',
        },
      });
    });
    this.pendingRequestMap.clear();

    // Dispose message handlers first
    this.readerDisposable?.dispose();
    this.readerErrorDisposable?.dispose();

    // Then dispose readers/writers
    this.messageReader?.dispose();
    this.messageWriter?.dispose();

    // make sure nothing can write to stdin anymore after we destroy the stream
    // this fixes an issue where a leftover 'Content Length' header would be written to the stdin
    // during the nxls shutdown sequence
    if (this.process?.stdin) {
      this.process.stdin.write = () => {
        return true;
      };
      this.process.stdin.end();
    }

    // Remove exit listener before killing process
    this.process?.removeListener('exit', this.earlyExitListener);

    // Destroy streams
    this.process?.stdout?.destroy();
    this.process?.stderr?.destroy();
    this.process?.stdin?.destroy();

    // Give the process a moment to exit gracefully
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Kill the process if it's still running
    if (this.process?.pid) {
      try {
        killGroup(this.process.pid);
      } catch (e) {
        if (this.verbose) {
          console.log(`NXLS WRAPPER: Error killing process group: ${e}`);
        }
      }
    }

    // Stop the daemon
    try {
      execSync(`npx nx@${version ?? defaultVersion} daemon --stop`, {
        cwd: this.cwd,
        timeout: 5000,
      });
    } catch (e) {
      if (this.verbose) {
        console.error('Error stopping daemon:', e);
      }
    }

    this.process = undefined;
    this.isShuttingDown = false;
  }

  async sendRequest(
    request: Omit<RequestMessage, 'jsonrpc' | 'id'>,
    customTimeoutMinutes?: number,
  ): Promise<ResponseMessage> {
    if (this.isShuttingDown) {
      throw new Error('Cannot send request: wrapper is shutting down');
    }

    if (!this.messageWriter) {
      throw new Error('Cannot send request: message writer not initialized');
    }

    let timeout: NodeJS.Timeout;
    return await new Promise<ResponseMessage>((resolve, reject) => {
      timeout = setTimeout(
        () => {
          this.pendingRequestMap.delete(id);
          reject(
            new Error(
              `Request ${request.method} timed out at ${new Date().toISOString()}`,
            ),
          );
        },
        (customTimeoutMinutes ?? 3) * 60 * 1000,
      );

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
          `at ${new Date().toISOString()}`,
        );
      }

      try {
        this.messageWriter?.write(fullRequest);
      } catch (e) {
        this.pendingRequestMap.delete(id);
        clearTimeout(timeout);
        reject(new Error(`Failed to send request: ${e}`));
      }
    }).finally(() => {
      clearTimeout(timeout);
    });
  }

  sendNotification(notification: Omit<NotificationMessage, 'jsonrpc'>) {
    if (this.isShuttingDown) {
      if (this.verbose) {
        console.log(
          'Skipping notification during shutdown:',
          notification.method,
        );
      }
      return;
    }

    if (!this.messageWriter) {
      if (this.verbose) {
        console.log('Cannot send notification: message writer not initialized');
      }
      return;
    }

    if (this.verbose) {
      console.log(
        'sending notification',
        JSON.stringify(notification, null, 2),
      );
    }

    try {
      this.messageWriter.write({
        jsonrpc: '2.0',
        ...notification,
      } as Message);
    } catch (e) {
      if (this.verbose) {
        console.log(`Failed to send notification: ${e}`);
      }
    }
  }

  async waitForNotification(
    method: string,
  ): Promise<object | any[] | undefined> {
    let timeout: NodeJS.Timeout;
    if (this.verbose) {
      console.log(`waiting for ${method}`, this.pendingNotificationMap);
    }
    return await new Promise<any>((resolve, reject) => {
      timeout = setTimeout(
        () => {
          this.pendingNotificationMap.delete(method);
          reject(new Error(`Timed out while waiting for ${method}`));
        },
        3 * 60 * 1000,
      );

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

  async triggerAndWaitForRefresh(): Promise<void> {
    this.sendNotification({
      method: 'nx/workspace/refresh',
      params: {},
    });
    await this.waitForNotification('nx/workspace/refresh');
  }

  setVerbose(verbose: boolean) {
    this.verbose = verbose;
  }

  private listenToLSPMessages(messageReader: StreamMessageReader) {
    this.readerDisposable = messageReader.listen((message) => {
      // Don't process messages if we're shutting down
      if (this.isShuttingDown) {
        return;
      }

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
      // Don't log errors during shutdown as they're expected
      if (!this.isShuttingDown) {
        // Content-Length errors often happen when the process is restarting
        // or during race conditions, they're not always fatal
        if (error.message?.includes('Content-Length')) {
          if (this.verbose) {
            console.log('Stream error (non-fatal):', error.message);
          }
          // Don't clear pending operations immediately - the process might recover
          return;
        }
        console.error('ERROR: ', error);
      }
    });
  }
}

function isNotificationMessage(
  message: Message,
): message is NotificationMessage {
  return !('id' in message);
}

function isResponseMessage(message: Message): message is ResponseMessage {
  return 'result' in message || 'error' in message;
}
