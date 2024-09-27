import { PDVData } from '@nx-console/shared/types';
import { getPDVData } from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import { Disposable, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import {
  assign,
  createActor,
  enqueueActions,
  fromPromise,
  setup,
  spawnChild,
} from 'xstate';
import { ProjectDetailsPreview } from './project-details-preview';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';

export class NewProjectDetailsPreview implements ProjectDetailsPreview {
  private webviewPanel: WebviewPanel = window.createWebviewPanel(
    'nx-console-project-details',
    `Project Details`,
    ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  projectRoot: string | undefined;
  workspaceRefreshListener: Disposable | undefined;

  constructor(private path: string) {
    const machine = setup({
      types: {
        context: {} as Partial<PDVData> & {
          multiSelectedProject: string | undefined;
        },
      },
      actors: {
        loadPDVData: fromPromise(async () => {
          return await getPDVData(path);
        }),
      },
      actions: {
        renderLoading: () => this.renderLoading(),
        renderPDV: ({ context }) =>
          this.renderPDV(context.pdvDataSerialized, context.graphBasePath),
        reRenderPDV: ({ context }) =>
          this.reRenderPDV(context.pdvDataSerialized),
        renderError: ({ context }) =>
          this.renderError(
            context.errorsSerialized,
            context.errorMessage,
            context.graphBasePath
          ),
        renderMultiPDV: ({ context }) =>
          this.renderMultiPDV(
            context.pdvDataSerializedMulti,
            context.graphBasePath
          ),
        renderNoGraphError: ({ context }) => this.renderNoGraphError(),
        assignLoadPDVData: assign(({ event }) => ({ ...event['output'] })),
        transitionConditionally: enqueueActions(({ context, enqueue }) => {
          if (
            !context.resultType ||
            context.resultType === 'NO_GRAPH_ERROR' ||
            !context.graphBasePath
          ) {
            enqueue.raise({ type: 'NO_GRAPH_ERROR' });
            return;
          }
          if (context.resultType === 'SUCCESS') {
            enqueue.raise({ type: 'PDV_DATA_LOAD_SUCCESS' });
            return;
          }
          if (context.resultType === 'SUCCESS_MULTI') {
            enqueue.raise({ type: 'PDV_DATA_LOAD_MULTI_SUCCESS' });
            return;
          }
          if (context.resultType === 'ERROR') {
            enqueue.raise({ type: 'PDV_DATA_LOAD_ERROR' });
            return;
          }
        }),
      },
    }).createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwBEw8BDASwBtYBiABQIDUB9AgQQBVWmAZAeVYJMAygFUAwmICiQoQG0ADAF1EKdLDJ4y6AHYqQAD0QBWAOwAaEAE9EJgGwAmAHS2ALCYDMADiPvbRgIz2XgC+wRZoWLiExORUdIwsHFx8AkySAErpvOkKykggyGoaWrr5hgimFtYI-v5ejvLytp7utc1GRp6h4RjY+ESklDT0zGycPPyCALIi3OwAksLiUjK5eoXqmjp65ZVWiC6Hjp4ube4d9gCcJ0Yu3QW9UQOxNAByvEwA4umstAASaUy2TW+Q2xW2ZUQVyctRM9nknk8-kabncVUQgXuET60UGVEcZG0xRIFG46BIEEJUGoEB0YAJ2gAbugANb07FPGJDBnE0nkynaKAIQnMnAkLbaXIg1SbEo7DEueTHBFGVyXeT2ZGHdE1TyXZxeeS+dXyQKXc5Yx79Ln42AAC3QAHcqSNqOlJAAxd1CP7SgpFCXyhDnfyOQLIy6a+QmIxBS62HUmGNh1HeXwBIJdMIPSLWvGwRz2p0uxiOVBgABm5ftVJpdIZzLZjg5eZehYdzsFIzLlerdqpwqZ6DFEqlSnWAblkIQLkuof8bn8ATcDls8g6Otc7gafk8ms8fgRvktudxbaLnagklQGFQbs93t949Bk4hoHK7iujln53klxc3h+F4Oq1EYSpgc0rT+O0nQnjizzcheVLXrePZVnA-aCnW2j0iKrLslaZ6IR2yE3ugqBoX2A54SOJRjnkMrgqU74HLY251GuRjXEEtgmJ4IGmp4372Mu9j2J4CL2HCoTZto6AQHA6yEQhVATrKb4GIglw6i4Ti2EuC4tHxXGmqqcGcvmPKaCSZIUlSalMUGDg6q026xmuMYHrprjyHc2YtkRtokV2jAOYG07uEaYZRpGyIxnGCb7BUCKOHO7guO4-52NGVzma2xHFiFDAEhAFBgGFU4scGJihrY+kuLc-6fv41wuIm0HOKYManGJum6XlgUFkhRWURh9kvupzGaTOEnHGudXhuqSYLomdWpT4SKmnOiItQNKlDcFUAjFMACuFCaBVGnlKcQnpQE7gmOq5yQS5saOHxMb-uajSmLYe02gdhVXmRqCXVN5TiaGP5gf+gEbTqiIuI4UniUaVyxm4lz-ZZw3A6hZCleVE2ORFYENO4Xhws16WXOYSURk4ppwi4tj-g4ulGNj56HSh5GjTWgpg0GDX6kEkXGbT8ImOuIELk4rm9a4LTmu4XMFZerzoJ8qAkMgdq86DxPhVVmVOCcbGdJ0kX2LpIFfuaElcb4rRsXVMnBEAA */
      id: 'projectDetails',
      initial: 'initialLoading',
      context: {
        resultType: undefined,
        pdvDataSerialized: undefined,
        errorMessage: undefined,
        errorsSerialized: undefined,
        graphBasePath: undefined,
        pdvDataSerializedMulti: undefined,
        multiSelectedProject: undefined,
      },
      states: {
        initialLoading: {
          entry: ['renderLoading'],
          invoke: {
            src: 'loadPDVData',
            onDone: {
              actions: ['assignLoadPDVData', 'transitionConditionally'],
            },
          },
        },
        showingPDV: {
          entry: 'renderPDV',
          initial: 'idle',
          on: {
            REFRESH: {
              target: '.refreshing',
            },
          },
          states: {
            idle: {},
            refreshing: {
              invoke: {
                src: 'loadPDVData',
                onDone: {
                  actions: [
                    'assignLoadPDVData',
                    enqueueActions(({ context, enqueue }) => {
                      if (context.resultType === 'SUCCESS') {
                        enqueue('reRenderPDV');
                      } else {
                        enqueue('transitionConditionally');
                      }
                    }),
                  ],
                },
              },
            },
          },
        },
        showingPDVMulti: {
          entry: 'renderMultiPDV',
        },
        showingError: {
          entry: 'renderError',
          on: {
            REFRESH: {
              target: '.refreshing',
            },
          },
          initial: 'idle',
          states: {
            idle: {},
            refreshing: {
              invoke: {
                src: 'loadPDVData',
                onDone: {
                  actions: ['assignLoadPDVData', 'transitionConditionally'],
                },
              },
            },
          },
        },
        showingNoGraphError: {
          entry: 'renderNoGraphError',
        },
      },
      on: {
        PDV_DATA_LOAD_SUCCESS: {
          target: '.showingPDV',
        },
        PDV_DATA_LOAD_ERROR: {
          target: '.showingError',
        },
        PDV_DATA_LOAD_MULTI_SUCCESS: {
          target: '.showingPDVMulti',
        },
        NO_GRAPH_ERROR: {},
      },
    });

    const actor = createActor(machine);
    actor.start();

    this.workspaceRefreshListener = onWorkspaceRefreshed(() => {
      actor.send({ type: 'REFRESH' });
    });
  }

  private renderLoading() {
    this.webviewPanel.webview.html = `<html><body>Loading...</body></html>`;
  }

  private renderPDV(
    pdvData: string | undefined,
    graphBasePath: string | undefined
  ) {
    if (pdvData === undefined || graphBasePath === undefined) {
      return;
    }
    let html = this.loadPDVHtmlBase(graphBasePath);
    html = html.replace(
      '</body>',
      /*html*/ ` 
          <script>
            const data = ${pdvData}
            const pdvService = window.renderPDV(data)
            
            // messages from the extension
             window.addEventListener('message', event => {
              const message = event.data; 
              if(message.type === 'reload') {
                pdvService.send({
                  type: 'loadData',
                  ...message.data,
                });
              }
            });
          </script>
        </body>`
    );
    this.webviewPanel.webview.html = html;
  }

  private reRenderPDV(pdvData: string | undefined) {
    if (pdvData === undefined) {
      return;
    }
    this.webviewPanel.webview.postMessage({
      type: 'reload',
      data: JSON.parse(pdvData),
    });
  }

  private renderError(
    errorsSerialized: string | undefined,
    errorMessage: string | undefined,
    graphBasePath: string | undefined
  ) {
    if (errorsSerialized === undefined || graphBasePath === undefined) {
      return;
    }
    let html = this.loadPDVHtmlBase(graphBasePath);
    html = html.replace(
      '</body>',
      `
       <script>
          const service = window.renderError({
            message: "${errorMessage ?? ''}",
            errors: ${errorsSerialized}
            }
          )
        </script>
    </body>`
    );
    this.webviewPanel.webview.html = html;
  }

  private renderMultiPDV(
    data: Record<string, string> | undefined,
    graphBasePath: string | undefined
  ) {
    if (data === undefined || graphBasePath === undefined) {
      return;
    }
    let html = this.loadPDVHtmlBase(graphBasePath);
    html = html.replace(
      '<div',
      `
      <div> MULTI </div>
      <div
      `
    );
    this.webviewPanel.webview.html = html;
  }

  private renderNoGraphError(error?: string) {
    this.webviewPanel.webview.html = `<html><body>ERROR: ${error}</body></html>`;
  }

  onDispose(callback: () => void): void {
    this.webviewPanel.onDidDispose(() => {
      this.workspaceRefreshListener?.dispose();
      callback();
    });
  }

  reveal(column?: ViewColumn): void {
    this.webviewPanel.reveal(column);
  }

  private loadPDVHtmlBase(graphBasePath: string): string {
    const asWebviewUri = (path: string) =>
      this.webviewPanel.webview
        .asWebviewUri(Uri.file(join(graphBasePath, path)))
        .toString();

    return `<html>
    <head>
    <script src="${asWebviewUri('environment.js')}"></script>
    <link rel="stylesheet" href="${asWebviewUri('styles.css')}">
    <style>
      body {
        background-color: var(--vscode-editor-background) !important;
        color: var(--vscode-editor-foreground) !important;
      }
      html {
        font-size: var(--vscode-font-size) !important;
      }
    </style>

    </head>
    <body>
        <script>
            window.__NX_RENDER_GRAPH__ = false;
        </script>
        <div style="padding: 0.5rem 0.5rem 0.5rem 0.5rem" id="app"></div>

        <script src="${asWebviewUri('runtime.js')}"></script>
        <script src="${asWebviewUri('styles.js')}"></script>
        <script src="${asWebviewUri('main.js')}"></script>

    </body>
    </html>`;
  }
}
