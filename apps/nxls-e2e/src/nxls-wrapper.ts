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
  private communicationHealthy = true;
  private earlyExitListener = (code: number) => {
    console.log(`nxls exited with code ${code}`);
    console.log(`nxls stderr: ${this.process?.stderr?.read()}`);
  };

  constructor(
    private verbose?: boolean,
    private env?: NodeJS.ProcessEnv,
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
    // Try graceful shutdown only if communication is healthy
    if (this.communicationHealthy) {
      try {
        await this.sendRequest(
          {
            method: 'shutdown',
          },
          0.5,
        ); // Use shorter timeout for shutdown
        this.sendNotification({ method: 'exit' });
      } catch (e) {
        if (this.verbose) {
          console.log(
            'Graceful shutdown failed, proceeding with force cleanup',
          );
        }
        this.communicationHealthy = false;
      }
    }

    // Cancel all pending operations
    this.cancelAllPendingOperations('nxls stopped');

    // Clean up all resources
    this.cleanupResources();

    // Stop daemon
    this.stopDaemon(version);

    // Force kill the process
    this.killProcess();

    // Reset state
    this.communicationHealthy = true;
  }

  async sendRequest(
    request: Omit<RequestMessage, 'jsonrpc' | 'id'>,
    customTimeoutMinutes?: number,
  ): Promise<ResponseMessage> {
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
      this.messageWriter?.write(fullRequest);
    }).finally(() => {
      clearTimeout(timeout);
    });
  }

  sendNotification(notification: Omit<NotificationMessage, 'jsonrpc'>) {
    if (this.verbose) {
      console.log(
        'sending notification',
        JSON.stringify(notification, null, 2),
      );
    }
    this.messageWriter?.write({
      jsonrpc: '2.0',
      ...notification,
    } as Message);
  }

  async waitForNotification(
    method: string,
  ): Promise<object | any[] | undefined> {
    let timeout: NodeJS.Timeout;
    if (this.verbose) {
      console.log(`waiting for ${method}`, this.pendingNotificationMap);
    }
    return await new Promise<any>((resolve, reject) => {
      // If communication is already unhealthy, reject immediately
      if (!this.communicationHealthy) {
        reject(new Error(`Cannot wait for ${method}: communication failed`));
        return;
      }

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

  private cancelAllPendingOperations(errorMessage = 'Communication failed') {
    // Cancel all pending notifications
    this.pendingNotificationMap.forEach(([resolve, timeout], method) => {
      resolve(new Error(`${errorMessage} while waiting for ${method}`));
      clearTimeout(timeout);
    });
    this.pendingNotificationMap.clear();

    // Cancel all pending requests
    this.pendingRequestMap.forEach(([resolve, timeout], id) => {
      resolve({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: errorMessage,
        },
      });
      clearTimeout(timeout);
    });
    this.pendingRequestMap.clear();
  }

  setVerbose(verbose: boolean) {
    this.verbose = verbose;
  }

  isCommunicationHealthy(): boolean {
    return this.communicationHealthy;
  }

  private cleanupResources() {
    // Clean up listeners first
    this.process?.removeListener('exit', this.earlyExitListener);

    // Dispose of message handlers
    try {
      this.readerDisposable?.dispose();
    } catch (e) {
      // Ignore disposal errors
    }
    try {
      this.readerErrorDisposable?.dispose();
    } catch (e) {
      // Ignore disposal errors
    }

    // Override stdin write before disposing streams
    if (this.process?.stdin && !this.process.stdin.destroyed) {
      this.process.stdin.write = (_chunk: any, cb: any) => {
        if (typeof cb === 'function') cb();
        return true;
      };
    }

    // Dispose message reader/writer
    try {
      this.messageReader?.dispose();
    } catch (e) {
      // Ignore disposal errors
    }
    try {
      this.messageWriter?.dispose();
    } catch (e) {
      // Ignore disposal errors
    }

    // Destroy streams
    try {
      this.process?.stdout?.destroy();
      this.process?.stderr?.destroy();
      this.process?.stdin?.destroy();
    } catch (e) {
      // Ignore stream destruction errors
    }
  }

  private stopDaemon(version?: string, timeout = 5000) {
    try {
      execSync(`npx nx@${version ?? defaultVersion} daemon --stop`, {
        cwd: this.cwd,
        timeout,
      });
    } catch (e) {
      if (this.verbose) {
        console.error('Failed to stop daemon:', e);
      }
    }
  }

  private killProcess() {
    if (this.process?.pid) {
      try {
        killGroup(this.process.pid);
      } catch (e) {
        if (this.verbose) {
          console.log(`NXLS WRAPPER: ${e}`);
        }
      }
    }
  }

  async forceCleanup(version?: string) {
    if (this.verbose) {
      console.log('Forcing cleanup of NXLS process');
    }

    this.communicationHealthy = false;

    // Cancel all pending operations immediately
    this.cancelAllPendingOperations();

    // Force kill the process first (different order than graceful shutdown)
    this.killProcess();

    // Stop daemon with shorter timeout
    this.stopDaemon(version, 3000);

    // Clean up resources (but ignore errors during force cleanup)
    try {
      this.cleanupResources();
    } catch (e) {
      // Ignore cleanup errors during force cleanup
    }

    this.communicationHealthy = true;
  }

  private listenToLSPMessages(messageReader: StreamMessageReader) {
    this.readerDisposable = messageReader.listen((message) => {
      try {
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
      } catch (error) {
        console.error('Error processing message:', error);
        this.communicationHealthy = false;
        this.cancelAllPendingOperations();
      }
    });

    this.readerErrorDisposable = messageReader.onError((error) => {
      console.error('ERROR: ', error);

      // Check if this is a Content-Length error specifically
      const isContentLengthError = error.message?.includes('Content-Length');
      if (isContentLengthError) {
        console.error(
          'Content-Length error detected - communication corrupted',
        );
      }

      this.communicationHealthy = false;
      // Cancel all pending operations when communication fails
      this.cancelAllPendingOperations();
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
