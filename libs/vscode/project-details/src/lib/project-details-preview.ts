import { debounce } from '@nx-console/shared/utils';
import {
  NxGraphServer,
  getNxGraphServer,
  handleGraphInteractionEvent,
  loadGraphBaseHtml,
} from '@nx-console/vscode/graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { getGraphWebviewManager } from '@nx-console/vscode/project-graph';
import {
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  commands,
  window,
} from 'vscode';

export class ProjectDetailsPreview {
  private webviewPanel: WebviewPanel;
  private graphServer: NxGraphServer;

  private isShowingErrorHtml = false;

  public projectRoot: string | undefined;

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
        enableScripts: true,
      }
    );

    this.loadHtml();

    this.graphServer = getNxGraphServer(extensionContext);
    this.graphServer.start().then((error?: { error: string }) => {
      if (error) {
        this.loadHtml();
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

  private async loadHtml() {
    let error = (await getNxWorkspace())?.error;
    const project = await getProjectByPath(this.path);

    if (!project) {
      if (!error) {
        error = `No project found at path ${this.path}`;
      }
    } else {
      this.projectRoot = project.root;
    }

    let html: string;
    if (error) {
      html = await this.loadErrorHtml(error);
      this.isShowingErrorHtml = true;
    } else {
      html = await loadGraphBaseHtml(this.webviewPanel.webview);

      html = html.replace(
        '</head>',
        /*html*/ `
      <script> 
        window.addEventListener('message', ({ data }) => {
          const { type, payload } = data;
          if(type === 'reload') {
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
      this.isShowingErrorHtml = false;
      this.webviewPanel.title = `${project?.name} Details`;
    }

    this.webviewPanel.webview.html = html;
  }

  private loadErrorHtml(error: string): string {
    return /*html*/ `
    <style>
        pre {
          white-space: pre-wrap;
          border-radius: 5px;
          border: 2px solid var(--vscode-editorWidget-border);
          padding: 20px;
        }
      </style>
      <p>Unable to load the project graph. The following error occurred:</p>
      <pre>${error}</pre>
    `;
  }

  private async handleGraphInteractionEvent(event: any) {
    const handled = await handleGraphInteractionEvent(event);
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

    // if (event.type === 'override-target') {
    //   this.overrideTarget(
    //     event.payload.projectName,
    //     event.payload.targetName,
    //     event.payload.targetConfigString
    //   );
    //   return;
    // }

    if (event.type.startsWith('request')) {
      const response = await this.graphServer.handleWebviewRequest(event);
      if (response) {
        this.webviewPanel.webview.postMessage(response);
      }
    }
  }

  // private async overrideTarget(
  //   projectName: string,
  //   targetName: string,
  //   targetConfigString: string
  // ) {
  //   const {
  //     workspacePath,
  //     workspace: { projects },
  //   } = await getNxWorkspace();
  //   const project = projects[projectName];
  //   const projectConfigPath = join(workspacePath, project.root, 'project.json');
  //   const doc = await workspace.openTextDocument(projectConfigPath);
  //   const column = window.visibleTextEditors.find(
  //     (editor) => editor.document.fileName === doc.fileName
  //   )?.viewColumn;
  //   await window.showTextDocument(doc, column ?? ViewColumn.Beside);

  //   const editor = window.visibleTextEditors.find((editor) =>
  //     editor.document.fileName.endsWith(projectConfigPath)
  //   );

  //   if (!editor) {
  //     return;
  //   }

  //   const json = JSON.parse(editor.document.getText());
  //   if (!json.targets) {
  //     json.targets = {};
  //   }

  //   json.targets[targetName] = JSON.parse(targetConfigString);
  //   await editor.edit((editBuilder) => {
  //     editBuilder.replace(
  //       new Range(
  //         editor.document.positionAt(0),
  //         editor.document.positionAt(editor.document.getText().length)
  //       ),
  //       JSON.stringify(json, null, 2)
  //     );
  //   });
  //   commands.executeCommand('editor.action.formatDocument');
  // }

  private debouncedRefresh = debounce(async () => {
    const error = (await getNxWorkspace())?.error;
    if (error) {
      this.loadHtml();
    } else if (this.isShowingErrorHtml) {
      this.loadHtml();
    } else {
      this.webviewPanel.webview.postMessage({ type: 'reload' });
    }
  }, 100);
}
