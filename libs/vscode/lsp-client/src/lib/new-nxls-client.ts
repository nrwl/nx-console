import {
  NxChangeWorkspace,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server/types';
import { getNxlsOutputChannel } from '@nx-console/vscode/output-channels';
import { join } from 'path';
import { Disposable, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { assign, createActor, fromPromise, setup, waitFor } from 'xstate';
import { nxlsClientStateMachine } from './nxls-client-state-machine';
import { randomUUID } from 'crypto';

let _nxlsClient: NewNxlsClient | undefined;

export function createNxlsClient(extensionContext: ExtensionContext) {
  _nxlsClient = new NewNxlsClient(extensionContext);
}

export function getNxlsClient(): NewNxlsClient {
  if (!_nxlsClient) {
    throw new Error('NxlsClient is not initialized');
  }
  return _nxlsClient;
}

export function sendNotification<P>(
  notificationType: NotificationType<P>,
  params?: P
) {
  getNxlsClient().sendNotification(notificationType, params);
}

export function onWorkspaceRefreshed(callback: () => void): Disposable {
  return getNxlsClient().onNotification(NxWorkspaceRefreshNotification, () =>
    callback()
  );
}

export class NewNxlsClient {
  private client: LanguageClient | undefined;

  private notificationListeners: Map<string, Map<string, () => void>> =
    new Map();
  private disposables: Disposable[] = [];

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
          }
        ),
        stopClient: fromPromise(async () => {
          return await this._stop();
        }),
      },
    })
  );

  public start(workspacePath: string) {
    this.actor.send({ type: 'START', value: workspacePath });
  }

  public stop() {
    this.actor.send({ type: 'STOP' });
  }

  public async restart() {
    this.stop();
    await waitFor(this.actor, (snapshot) => snapshot.matches('idle'));
    const workspacePath = this.actor.getSnapshot().context.workspacePath;
    if (!workspacePath) {
      throw new Error('Workspace path is required to start the client');
    }
    this.start(workspacePath);
  }
  public async sendRequest<P, R, E>(
    requestType: RequestType<P, R, E>,
    params: P
  ): Promise<R | undefined> {
    await waitFor(this.actor, (snapshot) => snapshot.matches('running'));
    if (!this.client) {
      throw new NxlsClientNotInitializedError();
    }
    return await this.client.sendRequest(requestType, params);
  }
  public sendNotification<P>(
    notificationType: NotificationType<P>,
    params?: P
  ) {
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

  public onNotification(type: NotificationType<any>, callback: () => void) {
    const id = randomUUID();

    if (!this.notificationListeners.has(type.method)) {
      this.notificationListeners.set(type.method, new Map());
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- type safe maps are tricky
    const callbacks = this.notificationListeners.get(type.method)!;
    callbacks.set(id, callback);

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
    const serverModule = this.extensionContext.asAbsolutePath(
      join('nxls', 'main.js')
    );

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
    };

    this.client = new LanguageClient(
      'NxConsoleClient',
      getNxlsOutputChannel().name,
      serverOptions,
      clientOptions
    );

    await this.client.start();

    this.registerNotificationListeners();

    return this.client.initializeResult?.['pid'];
  }

  private async _stop() {
    if (this.client) {
      await this.client.stop(2000);
    }

    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }

  private async registerNotificationListeners() {
    if (!this.client) {
      throw new NxlsClientNotInitializedError();
    }

    for (const listener of this.notificationListeners) {
      const [method, callbacks] = listener;
      this.disposables.push(
        this.client.onNotification(new NotificationType(method), () => {
          for (const callback of callbacks.values()) {
            callback();
          }
        })
      );
    }
  }
}

export class NxlsClientNotInitializedError extends Error {
  constructor() {
    super('Nxls Client not initialized. This should not happen.');
    this.name = 'NxlsClientNotInitializedError';
  }
}
