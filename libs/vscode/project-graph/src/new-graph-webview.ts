import { NxError } from '@nx-console/shared-types';
import { handleGraphInteractionEventBase } from '@nx-console/vscode-graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getGraphData } from '@nx-console/vscode-nx-workspace';
import type {
  ProjectGraphEvent,
  ProjectGraphHandleEventResult,
} from '@nx/graph/projects';
import type { ProjectGraph } from 'nx/src/devkit-exports';
import { join } from 'path';
import {
  commands,
  EventEmitter,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import {
  ActorRef,
  createActor,
  EventObject,
  fromPromise,
  waitFor,
} from 'xstate';
import {
  graphMachine,
  type LoadGraphDataOutput,
} from './new-graph-state-machine';

export type PartialHandleEventResult = Pick<
  ProjectGraphHandleEventResult,
  'projects' | 'edges'
>;

export class NewGraphWebview {
  private webviewPanel: WebviewPanel;
  private actor: ActorRef<any, EventObject>;

  private handleEventResultEventEmitter: EventEmitter<PartialHandleEventResult> =
    new EventEmitter<PartialHandleEventResult>();

  constructor() {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-graph-new',
      `Nx Graph`,
      ViewColumn.Active,
      {
        enableScripts: true,
      },
    );

    this.actor = createActor(
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
        if (event.type === 'initialized') {
          this.actor.send({ type: 'INITIALIZED' });
          return;
        }
        if (event.type === 'handleEventResult') {
          this.handleEventResultEventEmitter.fire(event.result);
          return;
        }
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
      this.actor.send({ type: 'REFRESH' });
    });

    this.webviewPanel.onDidDispose(() => {
      messageListener.dispose();
      viewStateListener.dispose();
      workspaceRefreshListener?.dispose();
      commands.executeCommand('setContext', 'graphWebviewVisible', false);
    });

    this.actor.start();
  }

  reveal(column?: ViewColumn) {
    this.webviewPanel.reveal(column);
  }

  dispose() {
    this.webviewPanel.dispose();
  }

  async sendCommandToGraph(
    command: ProjectGraphEvent,
  ): Promise<PartialHandleEventResult> {
    await waitFor(this.actor, (snapshot) =>
      snapshot.matches({
        showingGraph: 'idle',
      }),
    );
    if (!this.webviewPanel) return;

    this.webviewPanel.webview.postMessage(command);

    return await new Promise<PartialHandleEventResult>((resolve) => {
      const eventSubscriber = this.handleEventResultEventEmitter.event(
        (result) => {
          eventSubscriber.dispose();
          resolve(result);
        },
      );
    });
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
          

         let service = window.renderProjectGraph(data);

          window.addEventListener('message', (event) => {
            const message = event.data;
            service.send(message);
          });

          service.subscribe((state) => {
            if(state.event?.type === 'setGraphClient') {
             vscode.postMessage({
              type: 'initialized'
             })
            }
            if (state.context.handleEventResult && state.event?.type === 'handleEventResult') {
              vscode.postMessage({
                type: 'handleEventResult',
                result: {
                  projects: state.context.handleEventResult.projects,
                  edges: state.context.handleEventResult.edges,
                }
              })
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
      type: 'updateGraph',
      projects: Object.values(graphData.nodes),
      dependencies: graphData.dependencies,
      fileMap: undefined,
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
