import { workspaceDependencyPath } from '@nx-console/shared/npm';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { existsSync } from 'fs';
import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import type { SourceInformation } from 'nx/src/project-graph/utils/project-configuration-utils';
import { join } from 'path';
import { commands, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { ProjectDetailsPreview } from './project-details-preview';
import {
  handleGraphInteractionEventBase,
  loadGraphErrorHtml,
} from '@nx-console/vscode/graph-base';
import { getGraphWebviewManager } from '@nx-console/vscode/project-graph';
import { NxError } from '@nx-console/shared/types';

type PDVData = {
  project?: ProjectGraphProjectNode;
  sourceMap?: Record<string, SourceInformation>;
  errors?: NxError[];
};

export class NewProjectDetailsPreview implements ProjectDetailsPreview {
  projectRoot: string | undefined;

  private webviewPanel: WebviewPanel;

  constructor(private path: string) {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-details',
      `Project Details`,
      ViewColumn.Beside,
      {
        enableScripts: true,
      }
    );

    this.loadAndShowProjectDetails().then(() => {
      this.webviewPanel.reveal();
    });

    const interactionListener = this.webviewPanel.webview.onDidReceiveMessage(
      async (event) => {
        this.handleGraphInteractionEvent(event);
      }
    );

    const viewStateListener = this.webviewPanel.onDidChangeViewState(
      ({ webviewPanel }) => {
        commands.executeCommand(
          'setContext',
          'projectDetailsViewVisible',
          webviewPanel.visible
        );
      }
    );

    const workspaceRefreshListener = onWorkspaceRefreshed(() => {
      this.loadAndShowProjectDetails();
    });

    this.webviewPanel.onDidDispose(() => {
      interactionListener.dispose();
      viewStateListener.dispose();
      workspaceRefreshListener?.dispose();
      commands.executeCommand('setContext', 'projectDetailsViewVisible', false);
    });
  }
  reveal(column?: ViewColumn): void {
    this.webviewPanel.reveal(column);
  }
  onDispose(callback: () => void): void {
    this.webviewPanel.onDidDispose(callback);
  }

  public async loadAndShowProjectDetails() {
    const data = await this.loadPDVData();

    if (data?.errors) {
      this.webviewPanel.webview.html = loadGraphErrorHtml(data?.errors);
    } else if (data?.project) {
      this.projectRoot = data.project.data.root;

      this.loadPDVHtml(data);
    }
  }

  private async loadPDVHtml(data: PDVData) {
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

    const html = /*html*/ `
    <html>
    <head>
    <script src="${asWebviewUri('environment.js')}"></script>
  <link rel="stylesheet" href="${asWebviewUri('styles.css')}">

    </head>
    <body>
        <div id="root"></div>

    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>

    
    <script src="${asWebviewUri('runtime.js')}"></script>
    <script src="${asWebviewUri('styles.js')}"></script>
    <script src="${asWebviewUri('pdv.umd.js')}"></script>

      <script>
      const vscodeApi = acquireVsCodeApi();

      const root = ReactDOM.createRoot(document.getElementById('root'));
      
      const pdvelement = React.createElement(PDV.default, {
        project: ${JSON.stringify(data?.project)},
        sourceMap: ${JSON.stringify(data?.sourceMap)},
        onViewInProjectGraph: (data) => vscodeApi.postMessage({
          type: 'open-project-graph',
          payload: {
            projectName: data.projectName,
          }
        })
        }
      )
      root.render(React.createElement(PDV.ExpandedTargetsProvider, null, pdvelement));

    </script>

    </body>
    </html>
    `;

    this.webviewPanel.webview.html = html;
  }

  private async loadPDVData(): Promise<PDVData | undefined> {
    const workspace = await getNxWorkspace();

    const project = await getProjectByPath(this.path);

    if (!project || !project.name) {
      return {
        errors: workspace?.errors,
      };
    }

    const type =
      project.projectType === 'application'
        ? 'app'
        : project.projectType === 'library'
        ? 'lib'
        : 'e2e';

    return {
      project: {
        name: project.name,
        type,
        data: project,
      },
      sourceMap: workspace?.workspace.sourceMaps?.[project.root] ?? {},
      errors: workspace?.errors,
    };
  }

  private async handleGraphInteractionEvent(event: any) {
    const handled = await handleGraphInteractionEventBase(event);
    if (handled) return;

    if (event.type === 'open-project-graph') {
      getGraphWebviewManager().focusProject(event.payload.projectName);
      return;
    }

    if (event.type === 'open-task-graph') {
      getGraphWebviewManager().focusTarget(
        event.payload.projectName,
        event.payload.targetName
      );
      return;
    }
  }
}
