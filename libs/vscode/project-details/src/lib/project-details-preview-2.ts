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
import { Uri, ViewColumn, WebviewPanel, window } from 'vscode';

export class ProjectDetailsPreview2 {
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

    onWorkspaceRefreshed(() => {
      this.loadAndShowProjectDetails();
    });
  }

  public async loadAndShowProjectDetails() {
    const data = await this.loadPDVData();

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

    const html = `
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
        const root = ReactDOM.createRoot(document.getElementById('root'));
        
        const pdvelement = React.createElement(PDV.default, {project: ${JSON.stringify(
          data?.project
        )}, sourceMap: ${JSON.stringify(data?.sourceMap)}})
        root.render(React.createElement(PDV.ExpandedTargetsProvider, null, pdvelement));

        
    </script>

    </body>
    </html>
    `;

    this.webviewPanel.webview.html = html;
  }

  private async loadPDVData(): Promise<
    | {
        project: ProjectGraphProjectNode;
        sourceMap: Record<string, SourceInformation>;
      }
    | undefined
  > {
    const project = await getProjectByPath(this.path);

    if (!project || !project.name) {
      return;
    }

    const workspace = await getNxWorkspace();

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
    };
  }
}
