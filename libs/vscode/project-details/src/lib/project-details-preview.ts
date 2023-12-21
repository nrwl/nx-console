import {
  NxGraphServer,
  getNxGraphServer,
  handleGraphInteractionEvent,
  loadGraphBaseHtml,
} from '@nx-console/vscode/graph-base';
import {
  getNxWorkspace,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
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
    const column = window.visibleTextEditors.find(editor => editor.document.fileName === doc.fileName)?.viewColumn
    await window.showTextDocument(doc, column ?? ViewColumn.Beside)

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
}
