import { Disposable, ViewColumn, WebviewPanel, window } from 'vscode';
import { MessageType } from './graph-message-type';
import { graphService, ViewStatus } from './graph.machine';
import { loadError, loadHtml, loadSpinner } from './load-html';

export class GraphWebView implements Disposable {
  panel: WebviewPanel | undefined;

  constructor() {
    graphService.onTransition(async (state) => {
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
        this.panel.webview.html = loadError();
      }

      setTimeout(() => {
        graphService.execute(state);

        if (
          state.matches('content') &&
          state.context.project &&
          state.context.viewStatus == ViewStatus.ready
        ) {
          this.panel?.webview.postMessage(state.context.project);
        }
      });
    });

    graphService.start();
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

    this.panel.webview.onDidReceiveMessage((event) => {
      if (event.command === 'ready') {
        graphService.send('VIEW_READY');
      }
    });

    graphService.send('GET_CONTENT');
  }

  projectInWebview(projectName: string | undefined, type: MessageType) {
    if (!this.panel) {
      this._webview();
    }

    if (!projectName) {
      return;
    }

    this.panel?.reveal();

    graphService.send({ type, projectName });
  }

  refresh() {
    graphService.send('REFRESH');
  }
}
