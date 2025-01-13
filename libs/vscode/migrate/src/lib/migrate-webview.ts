import { directoryExists } from '@nx-console/shared-file-system';
import { workspaceDependencyPath } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { join } from 'path';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';

export class MigrateWebview {
  private _webviewPanel: WebviewPanel | undefined;

  constructor(private context: ExtensionContext) {}

  async openMigrateUi() {
    if (this._webviewPanel !== undefined) {
      this._webviewPanel.reveal();
      return;
    }
    const graphBasePath = await getGraphBasePath(getNxWorkspacePath());
    if (!graphBasePath) {
      window.showErrorMessage(
        'Error loading the Migrate UI. Did you run npm/yarn/pnpm install?'
      );
      return;
    }
    this._webviewPanel = window.createWebviewPanel(
      'nx-console',
      'Migrate UI',
      ViewColumn.Active,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [
          this.context.extensionUri,
          Uri.file(graphBasePath),
        ],
      }
    );

    this._webviewPanel.webview.html = this.loadMigrateHtml(
      graphBasePath,
      this._webviewPanel
    );

    this._webviewPanel.webview.onDidReceiveMessage((message) => {
      getOutputChannel().appendLine(JSON.stringify(message, null, 2));
    });

    this._webviewPanel.onDidDispose(() => {
      this._webviewPanel = undefined;
    });
  }

  private loadMigrateHtml(
    graphBasePath: string,
    webviewPanel: WebviewPanel
  ): string {
    const asWebviewUri = (path: string) =>
      webviewPanel.webview
        .asWebviewUri(Uri.file(join(graphBasePath, path)))
        .toString();

    return `<html>
    <head>
    <script src="${asWebviewUri('environment.js')}"></script>
    <link rel="stylesheet" href="${asWebviewUri('styles.css')}">
    <style>
      body {
        background-color: var(--vscode-editor-background) !important;
        color: var(--vscode-editor-foreground) !important;
      }
      html {
        font-size: var(--vscode-font-size) !important;
      }
    </style>

    </head>
    <body>
        <script>
            window.__NX_RENDER_GRAPH__ = false;
        </script>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="app"></div>

        <script src="${asWebviewUri('runtime.js')}"></script>
        <script src="${asWebviewUri('styles.js')}"></script>
        <script src="${asWebviewUri('main.js')}"></script>
        <script>
          const data = { migrations: [{description: 'hello'}]}
          const migrateService = window.renderMigrate(data)

          const vscode = acquireVsCodeApi()
          window.externalApi.graphInteractionEventListener = (message) => {
            console.log('message', message);
            vscode.postMessage(message);
          }
            
        </script>
    </body>
    </html>`;
  }
}

// TODO: don't simply duplicate this from nxls code?
async function getGraphBasePath(
  workspacePath: string
): Promise<string | undefined> {
  const nxWorkspaceDepPath = await workspaceDependencyPath(workspacePath, 'nx');

  if (!nxWorkspaceDepPath) {
    return undefined;
  }

  const graphBasePath = join(nxWorkspaceDepPath, 'src', 'core', 'graph');

  if (await directoryExists(graphBasePath)) {
    return graphBasePath;
  } else {
    return undefined;
  }
}
