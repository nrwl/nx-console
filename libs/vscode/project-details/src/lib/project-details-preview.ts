import { NxError } from '@nx-console/shared/types';
import { debounce } from '@nx-console/shared/utils';
import {
  NxGraphServer,
  getNxGraphServer,
  handleGraphInteractionEventBase,
  loadGraphBaseHtml
} from '@nx-console/vscode/graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getNxWorkspace,
  getProjectByPath
} from '@nx-console/vscode/nx-workspace';
import { getGraphWebviewManager } from '@nx-console/vscode/project-graph';
import { ProjectConfiguration } from 'nx/src/devkit-exports';
import {
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  commands,
  window
} from 'vscode';

export class ProjectDetailsPreview {
  public projectRoot: string | undefined;
  private webviewPanel: WebviewPanel;
  private graphServer: NxGraphServer;
  private graphServerError: (string | any)[] | undefined;
  private isShowingErrorHtml = false;
  private debouncedRefresh = debounce(async () => {
    const nxWorkspace = await getNxWorkspace();
    const errors = nxWorkspace?.errors;
    const isPartial = nxWorkspace?.isPartial;
    const hasProjects =
      Object.keys(nxWorkspace?.workspace.projects ?? {}).length > 0;
    if (this.isShowingErrorHtml || (errors && (!isPartial || !hasProjects))) {
      this.refresh();
    } else {
      this.webviewPanel.webview.postMessage({ type: 'reload' });
    }
  }, 100);

  constructor(
    private path: string,
    extensionContext: ExtensionContext,
    private expandedTarget?: string
  ) {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-details',
      `Project Details`,
      ViewColumn.Beside,
      {
        enableScripts: true
      }
    );

    this.refresh();

    this.graphServer = getNxGraphServer(extensionContext);
    this.graphServer.start().then((error?: { error: string }) => {
      if (error) {
        this.graphServerError = [error.error];
        this.refresh();
      }
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

    const workspaceRefreshListener = onWorkspaceRefreshed(() =>
      this.debouncedRefresh()
    );

    this.webviewPanel.onDidDispose(() => {
      interactionListener.dispose();
      viewStateListener.dispose();
      workspaceRefreshListener?.dispose();
      commands.executeCommand('setContext', 'projectDetailsViewVisible', false);
    });
  }

  reveal(column?: ViewColumn) {
    this.webviewPanel.reveal(column);
  }

  onDispose(callback: () => void) {
    this.webviewPanel.onDidDispose(callback);
  }

  private async refresh() {
    const project = await getProjectByPath(this.path);

    if (project) {
      this.projectRoot = project.root;
    }

    const nxWorkspace = await getNxWorkspace();
    const workspaceErrors = nxWorkspace?.errors;
    const isPartial = nxWorkspace?.isPartial;
    const hasProjects =
      Object.keys(nxWorkspace?.workspace.projects ?? {}).length > 0;
    const hasProject =
      project?.name &&
      nxWorkspace?.workspace.projects[project?.name] === undefined;
    if (
      workspaceErrors &&
      (!isPartial ||
        !hasProjects ||
        !hasProject ||
        nxWorkspace.nxVersion.major < 19)
    ) {
      this.loadErrorHtml(workspaceErrors);
      return;
    }

    if (!project) {
      this.loadErrorHtml([
        { message: `No project found at path ${this.path}` }
      ]);
      return;
    }

    await this.loadHtml(project);
  }

  private async loadHtml(project: ProjectConfiguration) {
    let html = await loadGraphBaseHtml(this.webviewPanel.webview);

    html = html.replace(
      '</head>',
      /*html*/ `
      <script>
        window.addEventListener('message', ({ data }) => {
          const { type, payload } = data;
          if(type === 'reload') {
            console.log('reloading');
            window.waitForRouter().then(() => {
              window.externalApi.openProjectDetails('${project?.name}')
            })
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
          window.externalApi.openProjectDetails('${project?.name}'${
        this.expandedTarget ? `, '${this.expandedTarget}'` : ''
      })
        </script>
      </body>
      `
    );
    html = html.replace('<body', '<body style="padding: 0rem;" ');
    this.webviewPanel.title = `${project?.name} Details`;

    this.isShowingErrorHtml = false;

    this.webviewPanel.webview.html = html;
  }

  private loadErrorHtml(errors: NxError[]) {
    this.webviewPanel.webview.html = /*html*/ `
    <style>
        pre {
          white-space: pre-wrap;
          border-radius: 5px;
          border: 2px solid var(--vscode-editorWidget-border);
          padding: 20px;
        }
      </style>
      <p>Unable to load the project graph. The following error occurred:</p>
      ${errors
      .map(
        (error) => `<pre>${error.message ?? ''} \n ${error.stack ?? ''}</pre>`
      )
      .join('')}
    `;
    this.isShowingErrorHtml = true;
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

    if (event.type.startsWith('request')) {
      const response = await this.graphServer.handleWebviewRequest(event);
      if (response) {
        if (response.error) {
          this.graphServerError = [response.error];
          this.refresh();
        } else {
          this.graphServerError = undefined;
          this.webviewPanel.webview.postMessage(response);
        }
      }
    }
  }
}
