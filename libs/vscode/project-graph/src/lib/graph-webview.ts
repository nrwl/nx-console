import { getOutputChannel } from '@nx-console/vscode/utils';
import { commands, Disposable, ViewColumn, WebviewPanel, window } from 'vscode';
import { waitFor } from 'xstate/lib/waitFor';
import { MessageType } from './graph-message-type';
import { graphService } from './graph.machine';
import { loadError, loadHtml, loadNoProject, loadSpinner } from './load-html';

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

  private _webview() {
    if (this.panel) {
      return;
    }

    this.panel = window.createWebviewPanel(
      'graph',
      'Nx Graph',
      { viewColumn: ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      graphService.send('VIEW_DESTROYED');
    });

    this.panel.webview.onDidReceiveMessage(async (event) => {
      if (event.command === 'ready') {
        await waitFor(graphService, (state) => state.matches('content'));
        graphService.send('VIEW_READY');
      }
      if (event.command === 'refresh') {
        commands.executeCommand('nxConsole.refreshWorkspace');
      }
    });

    graphService.send('GET_CONTENT');
  }

  projectInWebview(projectName: string | undefined, type: MessageType) {
    getOutputChannel().appendLine(`Graph - Opening graph for ${projectName}`);
    if (!this.panel) {
      this._webview();
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
      },
    });
  }

  showAllProjects() {
    getOutputChannel().appendLine(`Graph - Opening full graph`);

    if (!this.panel) {
      this._webview();
    }

    this.panel?.reveal();

    graphService.send('PROJECT_SELECTED', {
      data: {
        type: MessageType.all,
        projectName: '',
      },
    });
  }

  refresh() {
    graphService.send('REFRESH');
  }
}
