import { handleGraphInteractionEventBase } from '@nx-console/vscode-graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getGraphData } from '@nx-console/vscode-nx-workspace';
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
import type { ProjectGraph } from 'nx/src/devkit-exports';
import { NxError } from '@nx-console/shared-types';

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
            const result = await getGraphData();
            if (!result) {
              return {
                errors: {
                  errorsSerialized: JSON.stringify([
                    { message: 'Unable to load graph data' } as NxError,
                  ]),
                  errorMessage: 'Unable to load graph data',
                  isPartial: false,
                },
                resultType: 'ERROR',
              } as LoadGraphDataOutput;
            }

            if (result.resultType !== 'SUCCESS') {
              return {
                graphBasePath: result.graphBasePath,
                errors: {
                  errorsSerialized: result.errorsSerialized,
                  errorMessage: result.errorMessage,
                  isPartial: result.isPartial,
                },
                resultType: result.resultType,
              } as LoadGraphDataOutput;
            }

            return {
              graphData: result.graphDataSerialized
                ? JSON.parse(result.graphDataSerialized)
                : undefined,
              graphBasePath: result.graphBasePath,
              errors: {
                errorsSerialized: result.errorsSerialized,
                errorMessage: result.errorMessage,
                isPartial: result.isPartial,
              },
              resultType: result.resultType,
            } as LoadGraphDataOutput;
          }),
        },
        actions: {
          renderLoading: () => this.renderLoading(),
          renderGraph: ({ context }) =>
            this.renderGraph(context.graphData, context.graphBasePath),
          updateGraph: (
            _: unknown,
            params: { graphData: ProjectGraph | undefined },
          ) => this.updateGraph(params.graphData),
          renderError: ({ context }) =>
            this.renderError(context.errors, context.graphBasePath),
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

  private async renderGraph(
    graphData: ProjectGraph | undefined,
    graphBasePath: string | undefined,
  ) {
    if (!graphData || !graphBasePath) return;

    let html = this.loadGraphHtmlBase(graphBasePath);
    html = html.replace(
      '</body>',
      /* html */ `
        <script>
          const data = ${JSON.stringify(graphData)}
          const vscode = acquireVsCodeApi();
          window.externalApi = window.externalApi || {};
          window.externalApi.graphInteractionEventListener = (message) => {
            vscode.postMessage(message);
          };

         let service = window.renderProjectGraph(data);

          // Optional listener for incremental updates
          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message && message.type === 'update-graph') {
                service.send({
                  type: 'updateGraph',
                 ...message.data
                });
            }
          });
        </script>
      </body>`,
    );

    this.webviewPanel.webview.html = html;
  }

  private updateGraph(graphData: ProjectGraph | undefined) {
    if (!graphData) return;

    this.webviewPanel.webview.postMessage({
      type: 'update-graph',
      data: {
        projects: Object.values(graphData.nodes),
        dependencies: graphData.dependencies,
        fileMap: undefined,
      },
    });
  }

  private renderError(
    errors: {
      errorsSerialized: string | undefined;
      isPartial: boolean | undefined;
      errorMessage: string | undefined;
    },
    graphBasePath: string | undefined,
  ) {
    if (!graphBasePath) {
      // Fallback to previous simple error html
      this.webviewPanel.webview.html = `<html><body>
      <h2>Nx Console could not load the Project Graph.</h2>
      <h4>
        Make sure dependencies are installed and refresh the workspace from the editor toolbar.
      </h4>
      ${
        errors.errorMessage
          ? `<pre style="white-space:pre-wrap;">${errors.errorMessage}</pre>`
          : ''
      }
    </body></html>`;
      return;
    }

    let html = this.loadGraphHtmlBase(graphBasePath);
    html = html.replace(
      '</body>',
      `<script> 
          const service = window.renderError({
            message: "${errors.errorMessage ?? ''}",
            errors: ${errors.errorsSerialized ?? '[]'}
            }
          )
        </script>
        </body>`,
    );
    this.webviewPanel.webview.html = html;
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
