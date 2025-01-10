import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';

export class MigrateWebview {
  private _webviewPanel: WebviewPanel | undefined;

  constructor(private context: ExtensionContext) {}

  async openMigrateUi() {
    if (this._webviewPanel !== undefined) {
      this._webviewPanel.reveal();
      return;
    }
    this._webviewPanel = window.createWebviewPanel(
      'nx-console',
      'Migrate UI',
      ViewColumn.Active,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [this.context.extensionUri],
      }
    );

    this._webviewPanel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Migrate UI</title>
        </head>
        <body>
            <h1>Migrate UI</h1>
        </body>
        </html>
    `;

    this._webviewPanel.onDidDispose(() => {
      this._webviewPanel = undefined;
    });
  }
}
