import {
  getNxGraphServer,
  loadGraphBaseHtml,
} from '@nx-console/vscode/graph-base';
import { revealNxProject } from '@nx-console/vscode/nx-config-decoration';
import {
  getNxWorkspacePath,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/utils';
import { join } from 'path';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  commands,
  window,
} from 'vscode';

export class GraphWebviewManager {
  private webviewPanel: WebviewPanel | undefined;
  private currentPanelIsAffected: boolean = false;

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
      if (event.type === 'file-click') {
        getTelemetry().featureUsed('nx.graph.openProjectEdgeFile');
        const workspacePath = await getNxWorkspacePath();

        commands.executeCommand(
          'vscode.open',
          Uri.file(join(workspacePath, event.payload))
        );
        return;
      }
      if (event.type === 'open-project-config') {
        const projectName = event.payload;
        getTelemetry().featureUsed('nx.graph.openProjectConfigFile');
        getNxWorkspaceProjects().then((projects) => {
          const root = projects[projectName]?.root;
          if (!root) return;
          revealNxProject(projectName, root);
        });
        return;
      }
      if (event.type === 'run-task') {
        getTelemetry().featureUsed('nx.graph.runTask');
        CliTaskProvider.instance.executeTask({
          command: 'run',
          positional: event.payload,
          flags: [],
        });
        return;
      }
      if (event.type.startsWith('request')) {
        const response = await graphServer.handleWebviewRequest(event);
        this.webviewPanel?.webview.postMessage(response);
        return;
      }
    });

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
      this.currentPanelIsAffected = false;
    });

    this.webviewPanel.reveal();
  }
}
