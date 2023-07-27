import {
  getNxWorkspacePath,
  getNxWorkspaceProjects,
  getProjectGraphOutput,
  revealNxProject,
} from '@nx-console/vscode/nx-workspace';
import { getOutputChannel, getTelemetry } from '@nx-console/vscode/utils';
import {
  commands,
  Disposable,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import { waitFor } from 'xstate/lib/waitFor';
import { MessageType } from './graph-message-type';
import { graphService } from './graph.machine';
import { loadError, loadHtml, loadNoProject, loadSpinner } from './load-html';
import { join } from 'node:path';
import { CliTaskProvider } from '@nx-console/vscode/tasks';

export class GraphWebView implements Disposable {
  panel: WebviewPanel | undefined;

  constructor() {
    graphService.start();
    graphService.onTransition(async (state) => {
      getOutputChannel().appendLine(`Graph - ${state.value}`);

      if (!state.changed) {
        return;
      }

      if (!this.panel) {
        return;
      }

      if (state.matches('loading')) {
        this.panel.webview.html = loadSpinner();
      } else if (state.matches('content')) {
        this.panel.webview.html = await loadHtml(this.panel);
      } else if (state.matches('error')) {
        this.panel.webview.html = loadError(state.context.error);
      } else if (state.matches('no_project')) {
        this.panel.webview.html = loadNoProject();
      } else if (state.matches('viewReady')) {
        const project = state.context.project;
        this.panel?.webview.postMessage(project);
      }

      setTimeout(() => {
        graphService.execute(state);
      });
    });
  }

  dispose() {
    graphService.stop();
  }

  private async _webview() {
    if (this.panel) {
      return;
    }

    const workspacePath = await getNxWorkspacePath();
    const { directory } = await getProjectGraphOutput();

    this.panel = window.createWebviewPanel(
      'graph',
      'Nx Graph',
      { viewColumn: ViewColumn.Active, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [Uri.file(directory)],
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      graphService.send('VIEW_DESTROYED');
      commands.executeCommand('setContext', 'graphWebviewVisible', false);
    });

    this.panel.webview.onDidReceiveMessage(async (event) => {
      if (event.command === 'ready') {
        await waitFor(graphService, (state) => state.matches('content'));
        graphService.send('VIEW_READY');
      }
      if (event.command === 'refresh') {
        commands.executeCommand('nxConsole.refreshWorkspace');
      }
      if (event.command === 'fileClick') {
        getTelemetry().featureUsed('nx.graph.openProjectEdgeFile');
        commands.executeCommand(
          'vscode.open',
          Uri.file(join(workspacePath, event.data))
        );
      }
      if (event.command === 'openProject') {
        getTelemetry().featureUsed('nx.graph.openProjectConfigFile');
        getNxWorkspaceProjects().then((projects) => {
          const root = projects[event.data]?.root;
          if (!root) return;
          revealNxProject(event.data, root);
        });
      }
      if (event.command === 'runTask') {
        getTelemetry().featureUsed('nx.graph.runTask');
        CliTaskProvider.instance.executeTask({
          command: 'run',
          positional: event.data,
          flags: [],
        });
      }
    });

    this.panel.onDidChangeViewState(({ webviewPanel }) => {
      commands.executeCommand(
        'setContext',
        'graphWebviewVisible',
        webviewPanel.visible
      );
    });

    graphService.send('GET_CONTENT');
  }

  async projectInWebview(
    projectName: string | undefined,
    taskName: string | undefined,
    type: MessageType
  ) {
    getOutputChannel().appendLine(`Graph - Opening graph for ${projectName}`);
    if (!this.panel) {
      await this._webview();
    }

    if (!projectName) {
      graphService.send('NO_PROJECT');
      return;
    }

    this.panel?.reveal();

    graphService.send('PROJECT_SELECTED', {
      data: {
        type,
        projectName,
        taskName,
      },
    });
  }

  async showAllProjects() {
    getOutputChannel().appendLine(`Graph - Opening full graph`);

    if (!this.panel) {
      await this._webview();
    }

    this.panel?.reveal();

    graphService.send('PROJECT_SELECTED', {
      data: {
        type: MessageType.all,
        projectName: '',
      },
    });
  }

  async showAllTasks(taskName: string) {
    getOutputChannel().appendLine(`Graph - Opening full graph`);

    if (!this.panel) {
      await this._webview();
    }

    this.panel?.reveal();

    graphService.send('PROJECT_SELECTED', {
      data: {
        type: MessageType.allTasks,
        taskName,
        projectName: '',
      },
    });
  }

  refresh() {
    graphService.send('REFRESH');
  }
}
