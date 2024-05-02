import {
  getNxGraphServer,
  handleGraphInteractionEventBase,
  loadGraphBaseHtml,
} from '@nx-console/vscode/graph-base';
import {
  commands,
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import { Disposable } from 'vscode-languageserver';

export class GraphWebviewManager implements Disposable {
  private webviewPanel: WebviewPanel | undefined;
  private currentPanelIsAffected = false;

  constructor(private context: ExtensionContext) {}

  async showAllProjects() {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({ type: 'show-all' });
  }

  async focusProject(projectName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'focus-project',
      payload: { projectName },
    });
  }

  async selectProject(projectName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'select-project',
      payload: { projectName },
    });
  }

  async focusTarget(projectName: string, targetName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'focus-target',
      payload: { projectName, targetName },
    });
  }

  async showAllTargetsByName(targetName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'show-all-targets-by-name',
      payload: { targetName },
    });
  }

  async showAffectedProjects() {
    await this.openGraphWebview(true);
    this.webviewPanel?.webview.postMessage({ type: 'show-affected-projects' });
  }

  async openGraphWebview(affected = false) {
    // if we want to display affected projects, we need a separate graph server
    // so we rebuild the webview with that in mind
    const currentPanelMatchesAffectedState =
      this.currentPanelIsAffected === affected;

    if (this.webviewPanel && currentPanelMatchesAffectedState) {
      this.webviewPanel.reveal();
      return;
    }
    const graphServer = getNxGraphServer(this.context, affected);

    this.webviewPanel?.dispose();
    this.webviewPanel = window.createWebviewPanel(
      'graph',
      `Nx Graph`,
      ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    this.currentPanelIsAffected = affected;

    let html = await loadGraphBaseHtml(this.webviewPanel.webview);

    html = html.replace(
      '</head>',
      /*html*/ `
     <script> 
        window.addEventListener('message', async ({ data }) => {
            await window.waitForRouter()

            const { type, payload } = data;
            if(type === 'show-all') {
                window.externalApi.selectAllProjects()
            } else if (type === 'focus-project') {
                window.externalApi.focusProject(payload.projectName);
            } else if(type === 'select-project') {
              window.externalApi.toggleSelectProject(payload.projectName);
            } else if(type === 'focus-target') {
              window.externalApi.focusTarget(payload.projectName, payload.targetName);
            } else if(type === 'show-all-targets-by-name') {
              window.externalApi.selectAllTargetsByName(payload.targetName)
            } else if(type === 'show-affected-projects') {
              window.externalApi.showAffectedProjects()
            }
        }); 
    </script>
    </head>
    `
    );

    this.webviewPanel.webview.html = html;
    this.webviewPanel.webview.onDidReceiveMessage(async (event) => {
      const handled = await handleGraphInteractionEventBase(event);
      if (handled) return;
      if (event.type.startsWith('request')) {
        const response = await graphServer.handleWebviewRequest(event);
        this.webviewPanel?.webview.postMessage(response);
        return;
      }
    });

    const viewStateListener = this.webviewPanel.onDidChangeViewState(
      ({ webviewPanel }) => {
        commands.executeCommand(
          'setContext',
          'graphWebviewVisible',
          webviewPanel.visible
        );
      }
    );

    this.webviewPanel.onDidDispose(() => {
      commands.executeCommand('setContext', 'graphWebviewVisible', false);
      viewStateListener.dispose();

      this.webviewPanel = undefined;
      this.currentPanelIsAffected = false;
    });

    this.webviewPanel.reveal();
  }

  dispose() {
    this.webviewPanel?.dispose();
  }
}
