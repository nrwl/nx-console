import {
  handleGraphInteractionEventBase,
  loadGraphErrorHtml,
} from '@nx-console/vscode-graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { workspaceDependencyPath } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { join } from 'path';
import { createActor, fromPromise } from 'xstate';
import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import {
  graphMachine,
  type LoadGraphDataOutput,
} from './new-graph-state-machine';

export class NewGraphWebviewManager {
  private webviewPanel: WebviewPanel;

  constructor(private context: ExtensionContext) {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-graph-new',
      `Nx Graph`,
      ViewColumn.Active,
      {
        enableScripts: true,
      },
    );

    const actor = createActor(
      graphMachine.provide({
        actors: {
          loadGraphData: fromPromise<LoadGraphDataOutput>(async () => {
            const workspace = await getNxWorkspace();
            const graphDataSerialized = JSON.stringify(
              workspace?.projectGraph ?? {},
            );
            return {
              graphDataSerialized,
            } as LoadGraphDataOutput;
          }),
        },
        actions: {
          renderLoading: () => this.renderLoading(),
          renderGraph: ({ context }) =>
            this.renderGraph(context.graphDataSerialized, undefined),
          updateGraph: (
            _: unknown,
            params: { graphData: string | undefined },
          ) => this.updateGraph(params.graphData),
          renderError: ({ context }) =>
            this.renderError(context.errorsSerialized, context.errorMessage),
        },
      }),
    );

    const messageListener = this.webviewPanel.webview.onDidReceiveMessage(
      async (event) => {
        const handled = await handleGraphInteractionEventBase(event);
        if (handled) return;
        // Future: handle additional extension <-> webview messages here
      },
    );

    const viewStateListener = this.webviewPanel.onDidChangeViewState(
      ({ webviewPanel }) => {
        commands.executeCommand(
          'setContext',
          'graphWebviewVisible',
          webviewPanel.visible,
        );
      },
    );

    const workspaceRefreshListener = onWorkspaceRefreshed(() => {
      actor.send({ type: 'REFRESH' });
    });

    this.webviewPanel.onDidDispose(() => {
      messageListener.dispose();
      viewStateListener.dispose();
      workspaceRefreshListener?.dispose();
      commands.executeCommand('setContext', 'graphWebviewVisible', false);
    });

    actor.start();
  }

  reveal(column?: ViewColumn) {
    this.webviewPanel.reveal(column);
  }

  dispose() {
    this.webviewPanel.dispose();
  }

  private renderLoading() {
    this.webviewPanel.webview.html = `<html><body>Loading...</body></html>`;
  }

  private async renderGraph(graphData: string | undefined, _?: string) {
    if (!graphData) return;

    const nxWorkspacePath = await getNxWorkspacePath();
    const nxPath = await workspaceDependencyPath(nxWorkspacePath, 'nx');
    if (!nxPath) {
      this.renderError(
        JSON.stringify([{ message: 'Could not resolve Nx dependency path' }]),
        'Could not resolve Nx dependency path',
      );
      return;
    }

    let html = this.loadGraphHtmlBase(join(nxPath, 'src', 'core', 'graph'));
    html = html.replace(
      '</body>',
      /* html */ `
        <script>
          const data = ${graphData}
          const vscode = acquireVsCodeApi();
          window.externalApi = window.externalApi || {};
          window.externalApi.graphInteractionEventListener = (message) => {
            vscode.postMessage(message);
          };

         let service;
          if (typeof window.renderProjectGraph === 'function') {
            service = window.renderProjectGraph(data);
          }

          // Optional listener for incremental updates
          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message && message.type === 'update-graph') {
                service.send({
                  ...message.data,
                  type: 'updateGraph',
                });

            }
          });
        </script>
      </body>`,
    );

    this.webviewPanel.webview.html = html;
  }

  private updateGraph(graphData: string | undefined) {
    if (!graphData) return;
    this.webviewPanel.webview.postMessage({
      type: 'update-graph',
      data: JSON.parse(graphData),
    });
  }

  private renderError(
    errorsSerialized: string | undefined,
    _errorMessage: string | undefined,
  ) {
    try {
      if (errorsSerialized) {
        const errors = JSON.parse(errorsSerialized);
        this.webviewPanel.webview.html = loadGraphErrorHtml(errors);
        return;
      }
    } catch {
      // fall through to generic error
    }
    void _errorMessage;
    this.webviewPanel.webview.html = `<html><body>
      <h2>Nx Console could not load the Project Graph.</h2>
      <h4>
        Make sure dependencies are installed and refresh the workspace from the editor toolbar.
      </h4>
    </body></html>`;
  }

  private loadGraphHtmlBase(graphBasePath: string): string {
    const asWebviewUri = (path: string) =>
      this.webviewPanel.webview
        .asWebviewUri(Uri.file(join(graphBasePath, path)))
        .toString();

    return `<html>
      <head>
        <script src="${asWebviewUri('environment.js')}"></script>
        <link rel="stylesheet" href="${asWebviewUri('styles.css')}">
        <style>
            html, body, #app { height: 100%; }
            #app { width: 100%;  }
          body {
            background-color: var(--vscode-editor-background) !important;
            color: var(--vscode-editor-foreground) !important;
              margin: 0;
          }
          html { font-size: var(--vscode-font-size) !important; }
        </style>
      </head>
      <body>
        <script>
          window.__NX_RENDER_GRAPH__ = false;
          window.environment = "nx-console";
        </script>
          <div id="app"></div>
        <script src="${asWebviewUri('runtime.js')}"></script>
        <script src="${asWebviewUri('styles.js')}"></script>
        <script src="${asWebviewUri('main.js')}"></script>
      </body>
    </html>`;
  }
}
