import {
  CancellationToken,
  commands,
  Disposable,
  ExtensionContext,
  Uri,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  window,
} from 'vscode';
import { EventObject } from 'xstate';
import { ActorRef } from 'xstate';
import { MigrateViewData } from './migrate-state-machine';
import { isDeepStrictEqual } from 'util';

export class MigrateSidebarViewProvider implements WebviewViewProvider {
  public static viewId = 'nxMigrate';

  private _view: WebviewView | undefined;
  private _webviewSourceUri: Uri;
  private _refreshSubscription: Disposable | undefined;
  private _migrateViewData: MigrateViewData | undefined;

  constructor(
    private extensionContext: ExtensionContext,
    private actor: ActorRef<any, EventObject>
  ) {
    this._webviewSourceUri = Uri.joinPath(
      this.extensionContext.extensionUri,
      'migrate-sidebar-webview'
    );
  }

  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Thenable<void> | void {
    this.ensureStateSubscription();

    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionContext.extensionUri],
    };

    webviewView.webview.html = this.getWebviewContent(webviewView);

    webviewView.onDidDispose(() => {
      this._refreshSubscription?.dispose();
    });

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === 'open') {
        commands.executeCommand('nxMigrate.open');
      }
    });
  }

  refresh() {
    if (!this._view) {
      return;
    }
    this._view.webview.html = this.getWebviewContent(this._view);
  }

  private getWebviewContent(webviewView: WebviewView): string {
    const webviewScriptUri = webviewView.webview.asWebviewUri(
      Uri.joinPath(this._webviewSourceUri, 'main.js')
    );

    const codiconsUri = webviewView.webview.asWebviewUri(
      Uri.joinPath(
        this.extensionContext.extensionUri,
        'node_modules',
        '@vscode',
        'codicons',
        'dist',
        'codicon.css'
      )
    );

    const vscodeElementsUri = webviewView.webview.asWebviewUri(
      Uri.joinPath(
        this.extensionContext.extensionUri,
        'node_modules',
        '@vscode-elements',
        'elements',
        'dist',
        'bundled.js'
      )
    );

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet">

				<title>Nx Cloud Onboarding</title>
         <script
        src="${vscodeElementsUri}"
        type="module"
      ></script>
      </head>
      <body>
        <script type="module" src="${webviewScriptUri}"></script>
				<root-element state='${
          this.actor.getSnapshot().value
        }' migrateViewData='${JSON.stringify(
      this._migrateViewData
    )}'></root-element>
			</body>
			</html>`;
  }

  private ensureStateSubscription() {
    if (this._refreshSubscription) {
      return;
    }

    this._migrateViewData = this.actor.getSnapshot().context;
    const sub = this.actor.subscribe((state) => {
      const newState = state.context;

      if (newState && !isDeepStrictEqual(this._migrateViewData, newState)) {
        this._migrateViewData = newState;
        this.refresh();
      }
    });
    this._refreshSubscription = new Disposable(() => {
      sub.unsubscribe();
      this._refreshSubscription = undefined;
    });
    this.extensionContext.subscriptions.push(this._refreshSubscription);
  }

  static create(context: ExtensionContext, actor: ActorRef<any, EventObject>) {
    const onboardingProvider = new MigrateSidebarViewProvider(context, actor);
    context.subscriptions.push(
      window.registerWebviewViewProvider(
        MigrateSidebarViewProvider.viewId,
        onboardingProvider
      )
    );
  }
}
