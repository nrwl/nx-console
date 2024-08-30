import { workspaceDependencyPath } from '@nx-console/shared/npm';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Uri, ViewColumn, WebviewPanel, window } from 'vscode';

export class ProjectDetailsPreview2 {
  private webviewPanel: WebviewPanel;

  constructor() {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-details',
      `Project Details`,
      ViewColumn.Beside,
      {
        enableScripts: true,
      }
    );

    this.showProjectDetails().then(() => {
      this.webviewPanel.reveal();
    });
  }

  public async showProjectDetails() {
    const workspacePath = await getNxWorkspacePath();
    const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
    if (!nxPath || !existsSync(nxPath)) {
      window.showErrorMessage(
        'Error loading the nx graph. Did you run npm/yarn/pnpm install?'
      );
      return;
    }
    const graphPath = join(nxPath, 'src', 'core', 'graph');

    const asWebviewUri = (path: string) =>
      this.webviewPanel.webview
        .asWebviewUri(Uri.file(join(graphPath, path)))
        .toString();

    let html = readFileSync(join(graphPath, 'index.html'), 'utf-8');
    html = html.replace(/environment.js/g, asWebviewUri('environment.js'));
    html = html.replace(/polyfills.js/g, asWebviewUri('polyfills.js'));
    html = html.replace(/runtime.js/g, asWebviewUri('runtime.js'));
    html = html.replace(/styles.js/g, asWebviewUri('styles.js'));
    html = html.replace(/styles.css/g, asWebviewUri('styles.css'));
    html = html.replace(/main.js/g, asWebviewUri('pdv.js'));

    this.webviewPanel.webview.html = html;
  }
}
