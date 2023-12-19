import {
  NxGraphServer,
  getNxGraphServer,
  handleGraphInteractionEvent,
  loadGraphBaseHtml,
} from '@nx-console/vscode/graph-base';
import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';

export class ProjectDetailsPreview {
  private webviewPanel: WebviewPanel;
  private graphServer: NxGraphServer;

  constructor(private projectName: string, extensionContext: ExtensionContext) {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-details',
      `${projectName} Details`,
      ViewColumn.Beside,
      {
        enableScripts: true,
      }
    );

    this.loadHtml().then((html) => {
      this.webviewPanel.webview.html = html;
    });

    this.graphServer = getNxGraphServer(extensionContext);
    this.webviewPanel.webview.onDidReceiveMessage(async (event) => {
      const handled = await handleGraphInteractionEvent(event);
      if (handled) return;

      if (event.type.startsWith('request')) {
        const response = await this.graphServer.handleWebviewRequest(event);
        this.webviewPanel.webview.postMessage(response);
      }
    });
    this.graphServer.updatedEventEmitter.event(() => {
      this.webviewPanel.webview.postMessage({ type: 'reload' });
    });
  }

  reveal(column?: ViewColumn) {
    this.webviewPanel.reveal(column);
  }

  onDispose(callback: () => void) {
    this.webviewPanel.onDidDispose(callback);
  }

  private async loadHtml(): Promise<string> {
    let html = await loadGraphBaseHtml(this.webviewPanel.webview);

    html = html.replace(
      '</head>',
      /*html*/ `
    <script> 
      window.addEventListener('message', ({ data }) => {
        const { type } = data;
        if(type === 'reload') {
          window.externalApi.router.navigate('/project-details/${this.projectName}')
        }
      });
    </script>
  
    </head>
    `
    );

    html = html.replace(
      '</body>',
      /*html*/ `
      <script type="module">
        await window.waitForRouter()
        window.externalApi.router?.navigate('/project-details/${this.projectName}')
      </script>
    </body>
    `
    );
    return html;
  }
}
