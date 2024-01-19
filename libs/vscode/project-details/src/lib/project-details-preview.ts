import { debounce } from '@nx-console/shared/utils';
import {
  NxGraphServer,
  getNxGraphServer,
  handleGraphInteractionEvent,
  loadGraphBaseHtml,
} from '@nx-console/vscode/graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { getGraphWebviewManager } from '@nx-console/vscode/project-graph';
import { join } from 'path';
import {
  ExtensionContext,
  Range,
  ViewColumn,
  WebviewPanel,
  commands,
  window,
  workspace,
} from 'vscode';

export class ProjectDetailsPreview {
  private webviewPanel: WebviewPanel;
  private graphServer: NxGraphServer;

  constructor(
    private projectName: string,
    extensionContext: ExtensionContext,
    private expandedTarget?: string
  ) {
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

    const interactionListener = this.webviewPanel.webview.onDidReceiveMessage(
      async (event) => {
        this.handleGraphInteractionEvent(event);
      }
    );
    const graphServerListener = this.graphServer.updatedEventEmitter.event(
      () => {
        this.debouncedRefresh();
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

    onWorkspaceRefreshed(() => this.debouncedRefresh());

    this.webviewPanel.onDidDispose(() => {
      interactionListener.dispose();
      graphServerListener.dispose();
      viewStateListener.dispose();
      commands.executeCommand('setContext', 'projectDetailsViewVisible', false);
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
        const { type, payload } = data;
        if(type === 'reload') {
          const currentLocation = window.externalApi.router.state.location;

          const newUrl = currentLocation.pathname + currentLocation.search
          window.externalApi.router.navigate(newUrl, {
            preventScrollReset: true,
          });
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
        window.externalApi.openProjectDetails('${this.projectName}'${
        this.expandedTarget ? `, '${this.expandedTarget}'` : ''
      })
      </script>
    </body>
    `
    );
    html = html.replace('<body', '<body style="padding: 0rem;" ');
    return html;
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

    if (event.type === 'override-target') {
      this.overrideTarget(
        event.payload.projectName,
        event.payload.targetName,
        event.payload.targetConfigString
      );
      return;
    }

    if (event.type.startsWith('request')) {
      const response = await this.graphServer.handleWebviewRequest(event);
      this.webviewPanel.webview.postMessage(response);
    }
  }

  private async overrideTarget(
    projectName: string,
    targetName: string,
    targetConfigString: string
  ) {
    const {
      workspacePath,
      workspace: { projects },
    } = await getNxWorkspace();
    const project = projects[projectName];
    const projectConfigPath = join(workspacePath, project.root, 'project.json');
    const doc = await workspace.openTextDocument(projectConfigPath);
    const column = window.visibleTextEditors.find(
      (editor) => editor.document.fileName === doc.fileName
    )?.viewColumn;
    await window.showTextDocument(doc, column ?? ViewColumn.Beside);

    const editor = window.visibleTextEditors.find((editor) =>
      editor.document.fileName.endsWith(projectConfigPath)
    );

    if (!editor) {
      return;
    }

    const json = JSON.parse(editor.document.getText());
    if (!json.targets) {
      json.targets = {};
    }

    json.targets[targetName] = JSON.parse(targetConfigString);
    await editor.edit((editBuilder) => {
      editBuilder.replace(
        new Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        ),
        JSON.stringify(json, null, 2)
      );
    });
    commands.executeCommand('editor.action.formatDocument');
  }

  private debouncedRefresh = debounce(
    () => this.webviewPanel.webview.postMessage({ type: 'reload' }),
    100
  );
}
