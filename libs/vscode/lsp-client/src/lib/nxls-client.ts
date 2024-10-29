import {
  NxChangeWorkspace,
  NxWorkspaceRefreshNotification,
  NxWorkspaceRefreshStartedNotification,
} from '@nx-console/language-server/types';
import { killTree } from '@nx-console/shared/utils';
import {
  getNxlsOutputChannel,
  getOutputChannel,
} from '@nx-console/vscode/output-channels';
import { join } from 'path';
import {
  Disposable,
  EventEmitter,
  ExtensionContext,
  ProgressLocation,
  window,
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: NxlsClient | undefined;

export function createNxlsClient(context: ExtensionContext) {
  if (client) {
    return client;
  }

  client = new NxlsClient(context);
  return client;
}

export function getNxlsClient() {
  if (!client) {
    getOutputChannel().appendLine(
      'Nxls client not initialized. Make sure to initialize it via createNxlsClient first'
    );
  }
  return client;
}

export function onWorkspaceRefreshed(
  callback: () => void
): Disposable | undefined {
  return getNxlsClient()?.subscribeToRefresh(callback);
}

export function sendNotification<P>(
  notificationType: NotificationType<P>,
  params?: P
) {
  getNxlsClient()?.sendNotification(notificationType, params);
}

export async function sendRequest<P, R, E>(
  requestType: RequestType<P, R, E>,
  params: P
): Promise<R | undefined> {
  return await getNxlsClient()?.sendRequest(requestType, params);
}

type LspClientStates = 'idle' | 'starting' | 'running' | 'stopping';

class NxlsClient {
  private state: LspClientStates = 'idle';

  private workspacePath: string | undefined;
  private client: LanguageClient | undefined;
  private onRefreshNotificationDisposable: Disposable | undefined;
  private onRefreshStartedNotificationDisposable: Disposable | undefined;

  private refreshedEventEmitter = new EventEmitter<void>();
  private refreshStartedEventEmitter = new EventEmitter<void>();

  private disposables: Disposable[] = [];

  constructor(private extensionContext: ExtensionContext) {}

  public sendNotification<P>(
    notificationType: NotificationType<P>,
    params?: P
  ) {
    this.client?.sendNotification(notificationType, params);
  }

  public async sendRequest<P, R, E>(
    requestType: RequestType<P, R, E>,
    params: P
  ): Promise<R | undefined> {
    return await this.client?.sendRequest(requestType, params);
  }

  public async start(workspacePath: string) {
    if (this.state !== 'idle') {
      if (this.workspacePath !== workspacePath) {
        this.workspacePath = workspacePath;
        this.sendNotification(NxChangeWorkspace, workspacePath);
      }
      return;
    }
    this.workspacePath = workspacePath;

    this.state = 'starting';

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

    this.onRefreshNotificationDisposable = this.client.onNotification(
      NxWorkspaceRefreshNotification,
      () => {
        this.refreshedEventEmitter.fire();
      }
    );

    this.onRefreshStartedNotificationDisposable = this.client.onNotification(
      NxWorkspaceRefreshStartedNotification,
      () => {
        this.refreshStartedEventEmitter.fire();
      }
    );

    this.showRefreshLoadingAtLocation(ProgressLocation.Window);

    this.state = 'running';
  }

  public async stop() {
    if (this.state === 'stopping') {
      return;
    }
    this.state = 'stopping';
    if (!this.client) {
      this.state = 'idle';
      return;
    }
    try {
      await this.client.stop(2000);
    } catch (e) {
      const nxlsPid = this.getNxlsPid();
      if (nxlsPid) {
        killTree(nxlsPid);
      }
    }
    this.onRefreshNotificationDisposable?.dispose();
    this.onRefreshStartedNotificationDisposable?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.state = 'idle';
  }

  public subscribeToRefresh(callback: () => void) {
    return this.refreshedEventEmitter.event(callback);
  }

  public async restart() {
    if (!this.workspacePath) {
      getOutputChannel().appendLine(
        "Can't refresh workspace without a workspace path. Make sure to start the LSP client first."
      );
      return;
    }

    await this.stop();
    await this.start(this.workspacePath);
  }

  public showRefreshLoadingAtLocation(
    location:
      | ProgressLocation
      | {
          viewId: string;
        }
  ) {
    const disposable = this.refreshStartedEventEmitter.event(() => {
      const refreshPromise = new Promise<void>((resolve) => {
        const disposable = getNxlsClient()?.subscribeToRefresh(() => {
          disposable?.dispose();
          resolve();
        });
      });

      window.withProgress(
        {
          location,
          cancellable: false,
          title: 'Refreshing Nx workspace',
        },
        async () => {
          await refreshPromise;
        }
      );
    });
    this.disposables.push(disposable);
  }

  public getNxlsPid(): number | undefined {
    return this.client?.initializeResult?.['pid'];
  }
}
