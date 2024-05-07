import {
  getNxGraphServer,
  handleGraphInteractionEventBase,
  loadGraphBaseHtml,
  loadGraphErrorHtml,
} from '@nx-console/vscode/graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
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

  private lastGraphCommand: GraphCommand | undefined;

  constructor(private context: ExtensionContext) {
    onWorkspaceRefreshed(() => {
      if (this.webviewPanel) {
        this.loadGraphWebview(this.currentPanelIsAffected);
        this.rerunLastGraphCommand();
      }
    });
  }

  async showAllProjects() {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({ type: 'show-all' });
    this.lastGraphCommand = { type: 'show-all' };
  }

  async focusProject(projectName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'focus-project',
      payload: { projectName },
    });
    this.lastGraphCommand = { type: 'focus-project', projectName };
  }

  async selectProject(projectName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'select-project',
      payload: { projectName },
    });
    this.lastGraphCommand = { type: 'select-project', projectName };
  }

  async focusTarget(projectName: string, targetName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'focus-target',
      payload: { projectName, targetName },
    });
    this.lastGraphCommand = { type: 'focus-target', projectName, targetName };
  }

  async showAllTargetsByName(targetName: string) {
    await this.openGraphWebview();
    this.webviewPanel?.webview.postMessage({
      type: 'show-all-targets-by-name',
      payload: { targetName },
    });
    this.lastGraphCommand = { type: 'show-all-targets-by-name', targetName };
  }

  async showAffectedProjects() {
    await this.openGraphWebview(true);
    this.webviewPanel?.webview.postMessage({ type: 'show-affected-projects' });
    this.lastGraphCommand = { type: 'show-affected-projects' };
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

    this.currentPanelIsAffected = affected;

    await this.loadGraphWebview(affected);

    this.webviewPanel?.reveal();
  }

  private async loadGraphWebview(affected: boolean) {
    const graphServer = getNxGraphServer(this.context, affected);

    const viewColumn = this.webviewPanel?.viewColumn || ViewColumn.Active;

    this.webviewPanel?.dispose();

    this.webviewPanel = window.createWebviewPanel(
      'graph',
      `Nx Graph`,
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const nxWorkspace = await getNxWorkspace();
    const workspaceErrors = nxWorkspace?.errors;
    const isPartial = nxWorkspace?.isPartial;
    const hasProjects =
      Object.keys(nxWorkspace?.workspace.projects ?? {}).length > 0;
    const hasProject =
      this.lastGraphCommand &&
      isCommandWithProjectName(this.lastGraphCommand) &&
      nxWorkspace?.workspace.projects[this.lastGraphCommand.projectName] !==
        undefined;

    let html: string;
    if (
      workspaceErrors &&
      (!isPartial ||
        !hasProjects ||
        !hasProject ||
        nxWorkspace.nxVersion.major < 19)
    ) {
      html = loadGraphErrorHtml(workspaceErrors);
    } else {
      html = await loadGraphBaseHtml(this.webviewPanel.webview);

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
    }

    this.webviewPanel.webview.html = html;
    const messageListener = this.webviewPanel.webview.onDidReceiveMessage(
      async (event) => {
        const handled = await handleGraphInteractionEventBase(event);
        if (handled) return;
        if (event.type.startsWith('request')) {
          const response = await graphServer.handleWebviewRequest(event);
          this.webviewPanel?.webview.postMessage(response);
          return;
        }
      }
    );

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
      messageListener.dispose();

      this.webviewPanel = undefined;
    });
  }

  private rerunLastGraphCommand() {
    if (!this.lastGraphCommand) return;

    switch (this.lastGraphCommand.type) {
      case 'show-all':
        this.showAllProjects();
        break;
      case 'focus-project':
        this.focusProject(this.lastGraphCommand.projectName);
        break;
      case 'select-project':
        this.selectProject(this.lastGraphCommand.projectName);
        break;
      case 'focus-target':
        this.focusTarget(
          this.lastGraphCommand.projectName,
          this.lastGraphCommand.targetName
        );
        break;
      case 'show-all-targets-by-name':
        this.showAllTargetsByName(this.lastGraphCommand.targetName);
        break;
      case 'show-affected-projects':
        this.showAffectedProjects();
        break;
    }
  }

  dispose() {
    this.webviewPanel?.dispose();
  }
}

type GraphCommand =
  | ShowAllCommand
  | FocusProjectCommand
  | SelectProjectCommand
  | FocusTargetCommand
  | ShowAllTargetsByNameCommand
  | ShowAffectedProjectsCommand;

interface ShowAllCommand {
  type: 'show-all';
}

interface FocusProjectCommand {
  type: 'focus-project';
  projectName: string;
}

interface SelectProjectCommand {
  type: 'select-project';
  projectName: string;
}

interface FocusTargetCommand {
  type: 'focus-target';
  projectName: string;
  targetName: string;
}

interface ShowAllTargetsByNameCommand {
  type: 'show-all-targets-by-name';
  targetName: string;
}

interface ShowAffectedProjectsCommand {
  type: 'show-affected-projects';
}

function isCommandWithProjectName(
  command: GraphCommand
): command is FocusProjectCommand | SelectProjectCommand {
  return command.type === 'focus-project' || command.type === 'select-project';
}
