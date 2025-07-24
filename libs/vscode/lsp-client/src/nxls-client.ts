import {
  NxChangeWorkspace,
  NxStopDaemonRequest,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server-types';
import { killGroup } from '@nx-console/shared-utils';
import {
  getNxlsOutputChannel,
  getOutputChannel,
  logAndShowError,
} from '@nx-console/vscode-output-channels';
import { getGitApi, getGitRepository } from '@nx-console/vscode-utils';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Disposable, ExtensionContext, ProgressLocation, window } from 'vscode';
import {
  CloseAction,
  ErrorAction,
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { createActor, fromPromise, waitFor } from 'xstate';
import { nxlsClientStateMachine } from './nxls-client-state-machine';

let _nxlsClient: NxlsClient | undefined;

export function createNxlsClient(extensionContext: ExtensionContext) {
  _nxlsClient = new NxlsClient(extensionContext);

  const disposable = refreshWorkspaceOnBranchChange(_nxlsClient);
  if (disposable) {
    extensionContext.subscriptions.push(disposable);
  }
}

export function getNxlsClient(): NxlsClient {
  if (!_nxlsClient) {
    throw new Error('NxlsClient is not initialized');
  }
  return _nxlsClient;
}

export function onWorkspaceRefreshed(callback: () => void): Disposable {
  return getNxlsClient().onNotification(NxWorkspaceRefreshNotification, () =>
    callback(),
  );
}

export class NxlsClient {
  private client: LanguageClient | undefined;

  private notificationListeners: Map<
    string,
    Map<string, (payload: any) => void>
  > = new Map();
  private notificationListenerDisposables: Disposable[] = [];
  private processExitListener: Disposable | undefined;

  constructor(private extensionContext: ExtensionContext) {
    this.actor.start();
  }

  private actor = createActor(
    nxlsClientStateMachine.provide({
      actions: {
        sendRefreshNotification: ({ context }) =>
          this.sendNotification(NxChangeWorkspace, context.workspacePath),
      },
      actors: {
        startClient: fromPromise(
          async ({
            input,
          }: {
            input: { workspacePath: string | undefined };
          }) => {
            return await this._start(input.workspacePath);
          },
        ),
        stopClient: fromPromise(
          async ({ input }: { input: { isNxlsProcessAlive?: boolean } }) => {
            return await this._stop(input.isNxlsProcessAlive);
          },
        ),
      },
    }),
    {
      inspect: (event) => {
        const snapshot = event.actorRef.getSnapshot();
        if (event.type === '@xstate.snapshot' && snapshot.value) {
          getOutputChannel().appendLine(`Nxls Client - ${snapshot.value}`);
        }
      },
    },
  );

  public start(workspacePath?: string) {
    this.actor.send({ type: 'START', value: workspacePath });
  }

  public stop() {
    this.actor.send({ type: 'STOP' });
  }

  public async refreshWorkspace() {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Refreshing Workspace',
        cancellable: false,
      },
      async (progress) => {
        try {
          if (this.actor.getSnapshot().matches('running')) {
            progress.report({ message: 'Stopping nx daemon', increment: 10 });
            try {
              await this.sendRequest(NxStopDaemonRequest, undefined);
            } catch (e) {
              // errors while stopping the daemon aren't critical
            }

            this.stop();
          }
          progress.report({ increment: 30 });

          progress.report({ message: 'Restarting language server' });
          await waitFor(this.actor, (snapshot) => snapshot.matches('idle'));
          this.start();
          progress.report({ message: 'Refreshing workspace', increment: 30 });

          await this.sendNotification(NxWorkspaceRefreshNotification);

          await new Promise<void>((resolve) => {
            const disposable = this.onNotification(
              NxWorkspaceRefreshNotification,
              () => {
                disposable.dispose();
                resolve();
              },
            );
          });
        } catch (error) {
          logAndShowError(
            "Couldn't refresh workspace. Please view the logs for more information.",
            error,
          );
        }
      },
    );
  }

  public async sendRequest<P, R, E>(
    requestType: RequestType<P, R, E>,
    params: P,
    retry = 0,
  ): Promise<R | undefined> {
    try {
      if (this.actor.getSnapshot().matches('idle')) {
        this.actor.send({ type: 'START' });
      }
      await waitFor(this.actor, (snapshot) => snapshot.matches('running'));
      if (!this.client) {
        throw new NxlsClientNotInitializedError();
      }
      return await this.client.sendRequest(requestType, params);
    } catch (e) {
      if (e.code === -32097) {
        if (retry < 3) {
          return this.sendRequest(requestType, params, retry + 1);
        }
      } else {
        getOutputChannel().appendLine(
          `Error sending request to Nx Language Server: ${e}`,
        );
        return undefined;
      }
    }
  }

  public async sendNotification<P>(
    notificationType: NotificationType<P>,
    params?: P,
  ) {
    if (this.actor.getSnapshot().matches('idle')) {
      this.actor.send({ type: 'START' });
    }
    await waitFor(this.actor, (snapshot) => snapshot.matches('running'));

    if (!this.client) {
      throw new NxlsClientNotInitializedError();
    }
    this.client.sendNotification(notificationType, params);
  }

  public getNxlsPid() {
    return this.actor.getSnapshot().context.nxlsPid;
  }

  public setWorkspacePath(workspacePath: string) {
    this.actor.send({ type: 'SET_WORKSPACE_PATH', value: workspacePath });
  }

  public onNotification<P>(
    type: NotificationType<P>,
    callback: (payload: P) => void,
  ) {
    const id = randomUUID();

    if (!this.notificationListeners.has(type.method)) {
      this.notificationListeners.set(type.method, new Map());

      // if we add a new type of listener while the client is running, we need to reconfigure the listeners
      if (this.actor.getSnapshot().matches('running')) {
        this.unregisterNotificationListeners();
        this.registerNotificationListeners();
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- type safe maps are tricky
    const callbacks = this.notificationListeners.get(type.method)!;
    callbacks.set(id, (payload: P) => callback(payload));

    return new Disposable(() => {
      const typeCallbacks = this.notificationListeners.get(type.method);
      if (typeCallbacks) {
        typeCallbacks.delete(id);
        if (typeCallbacks.size === 0) {
          this.notificationListeners.delete(type.method);
        }
      }
    });
  }

  private async _start(workspacePath: string | undefined) {
    if (!workspacePath) {
      throw new Error('Workspace path is required to start the client');
    }

    this.client = await createLanguageClient(
      this.extensionContext,
      workspacePath,
    );

    await this.client.start();

    const onNxlsExit = () => {
      getOutputChannel().appendLine('Nxls process exited, stopping client.');
      this.actor.send({ type: 'STOP', isNxlsProcessAlive: false });
    };
    const serverProcess = this.client['_serverProcess'];
    serverProcess.on('exit', onNxlsExit);
    this.processExitListener = new Disposable(() => {
      serverProcess.off('exit', onNxlsExit);
    });

    this.registerNotificationListeners();

    getOutputChannel().appendLine(
      `Nxls process started with pid: ${this.client.initializeResult?.['pid']}`,
    );
    return this.client.initializeResult?.['pid'];
  }

  private async _stop(nxlsProcessAlive = true) {
    if (this.client && nxlsProcessAlive) {
      try {
        await this.client.stop(2000);
      } catch (e) {
        // timeout, kill the process forcefully instead
        const pid = this.actor.getSnapshot().context.nxlsPid;
        if (pid) {
          killGroup(pid);
        }
      }
    }
    this.processExitListener?.dispose();
    this.unregisterNotificationListeners();
  }

  private async registerNotificationListeners() {
    if (!this.client) {
      throw new NxlsClientNotInitializedError();
    }

    for (const listener of this.notificationListeners) {
      const [method, callbacks] = listener;
      this.notificationListenerDisposables.push(
        this.client.onNotification(
          new NotificationType(method),
          (payload: any) => {
            for (const callback of callbacks.values()) {
              callback(payload);
            }
          },
        ),
      );
    }
  }

  private async unregisterNotificationListeners() {
    this.notificationListenerDisposables.forEach((d) => d.dispose());
    this.notificationListenerDisposables = [];
  }
}

export class NxlsClientNotInitializedError extends Error {
  constructor() {
    super('Nxls Client not initialized. This should not happen.');
    this.name = 'NxlsClientNotInitializedError';
  }
}

async function createLanguageClient(
  extensionContext: ExtensionContext,
  workspacePath: string,
): Promise<LanguageClient> {
  const serverModule = extensionContext.asAbsolutePath(join('nxls', 'main.js'));

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    initializationOptions: {
      workspacePath,
    },
    documentSelector: [
      { scheme: 'file', language: 'json', pattern: '**/nx.json' },
      { scheme: 'file', language: 'json', pattern: '**/project.json' },
      { scheme: 'file', language: 'json', pattern: '**/workspace.json' },
      { scheme: 'file', language: 'json', pattern: '**/package.json' },
    ],
    synchronize: {},
    outputChannel: getNxlsOutputChannel(),
    outputChannelName: 'Nx Language Server',
    errorHandler: {
      closed: () => ({
        action: CloseAction.DoNotRestart,
        handled: true,
      }),
      error: () => ({
        action: ErrorAction.Continue,
        handled: true,
      }),
    },
  };

  return new LanguageClient(
    'NxConsoleClient',
    getNxlsOutputChannel().name,
    serverOptions,
    clientOptions,
  );
}

function refreshWorkspaceOnBranchChange(
  client: NxlsClient,
): Disposable | undefined {
  const repo = getGitRepository();
  if (!repo) {
    return;
  }

  let branch = repo.state.HEAD.name;
  return repo.state.onDidChange(async () => {
    const newBranch = repo.state.HEAD.name;
    if (newBranch !== branch) {
      console.log('Branch changed, refreshing workspace', branch, newBranch);
      branch = newBranch;
      await client.refreshWorkspace();
    }
  });
}
