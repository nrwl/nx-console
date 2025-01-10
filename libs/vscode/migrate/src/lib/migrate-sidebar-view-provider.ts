import {
  CancellationToken,
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

    webviewView.webview.html = this.getWebviewContent();
  }

  refresh() {
    if (!this._view) {
      return;
    }
    this._view.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    return `
    <pre>
    ${this.actor.getSnapshot().value}
    </pre>
    `;
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
