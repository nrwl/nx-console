import { PDVData } from '@nx-console/shared/types';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getPDVData } from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import {
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import {
  assign,
  createActor,
  enqueueActions,
  fromPromise,
  setup,
} from 'xstate';
import { ProjectDetailsPreview } from './project-details-preview';

export class NewProjectDetailsPreview implements ProjectDetailsPreview {
  private webviewPanel: WebviewPanel;

  projectRoot: string | undefined;
  workspaceRefreshListener: Disposable | undefined;

  constructor(private path: string, private context: ExtensionContext) {
    this.webviewPanel = window.createWebviewPanel(
      'nx-console-project-details',
      `Project Details`,
      ViewColumn.Beside,
      {
        enableScripts: true,
      }
    );
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
        reRenderPDV: this.reRenderPDV,
        renderError: ({ context }) =>
          this.renderError(
            context.errorsSerialized,
            context.errorMessage,
            context.graphBasePath
          ),
        renderMultiPDV: ({ context }) =>
          this.renderMultiPDV(
            context.pdvDataSerializedMulti,
            context.multiSelectedProject,
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
      /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwBEw8BDASwBtYBiABQIDUB9AgQQBVWmAZAeVYJMAygFUAwmICiQoQG0ADAF1EKdLDJ4y6AHYqQAD0QBWAOwAaEAE9EATgAcdgHQ2AjK4DMAFiM2TLgEwAbCYAviEWaFi4hMTkVHSMLBxcfAJMkgBKGbwZCspIIMhqGlq6BYYIphbWCC7ugZ6O-iZ2nvJB8jbyJjb+YREY2PhEpJQ09MxsnDz8ggCyItzsAJLC4lIyeXpF6po6ehVVVoiero7B8kZGdv7NdoFeoeGFg9EjcTQAcrxMAOIZrFoAAl0lkclsCjsSvtyoh3PDHCZPC4jO5uoEbDYjG5qogAv0XlFhrExo4yNoSiQKNx0CQIOSoNQIDowGTtAA3dAAa1ZkSGMVGVDZlOptPp2igCHJnJwJD22jyENUu1KB0QAFoWudTPJvEF3H4XC5cQh-HVHPJ3C4bhjPO4bJ4MX1nny3iShbAABboADuDIm1AykgAYkGhEClYVivK1QhkTZnP54ZaXD0TP4HSaXPIAo5WoF7kbOp4WkYCa7iYLYI4vb7-YxHKgwAAzJtehlMllszk8xwVgUfGvev0SiaNlttz0MqUc9Cy+WKpTbaOq2GVHzOU5oh4BQJGW4mhzyRF7245wIX+3l16Vwe1kdQCZzACuFE01AWS1WtGyAClJGI7DCJI3AAewkgEJGUIxmunh2O45znvIdguKc+6WiagRJk0WJdO4qL2A4ZYujeA6kve9YMC+b5kIGIZhhGS6QiuMKgBUyKNPUvg3CYVr+EYwQmkYuqOKmlxtLcknyME15EmRHrDpR1GaOOrZwFOEqdtorLStyvKke85GKaOjDKWQqmTtOunzqUi75Mq0JlGxxhGJxWJ2KYDjBMJ7gmga-gWg4vRefIyGhcRAxyYZCl1hKkioBgqB0aG0iMfZUYqqxBgnG4ibuM0SYBB4xrHLUnjNM4di6vCATSb0zqRfy0XVhRcUJegqAWepHbMtp3Z6X2Bnui1xlQPFiVde2EozjKcq2UoUEsU52XrghAk+Kh9jIdcWYZkYeaEQWlx2CYJgCWEzzaOgEBwNsQ1VsumXLRU6ouFhzjpmaup2qidj2Camr7flGYonBep-XYslNcNwqaFSNJ0gyj2ObGr2oR9tzZp4P3uBDfmok0dX+eVVz5Z4UNulWQ6xY+jDIzBzkIAaLh5WiVpphmngmkigTnAEf3XHaHlBBTt5GTTY5kBAFBgPTq6M9jx6Olx-geQE9rYyaWKcaYqaBNJHlnTYovySNEsNk2alTVActZYcpznFhXR-SY0kPOYpXZiJe7JrqlzwmaJvNdTD5Pq+mi289cIXo4XEtM0fECR7NRJiYzj1Pr3j+TY9QNYS0NU61tNUeH5lSzLkexnajSuDm6YSSYF7Jyc3jnFVmJtChmJu0HMNF2HNGTRpNvMU9sauY02Y50RmOuCaaEfa7nSdCdvG94Xo3jR1ldrszeUFXxxVZm9LM8+V4l1H9gTr3em-tZ15ey6PKOwW0jjKxirlJiW9pGFmXHv2dvcLajpbg33Fg+LenVLaWQlDvRmrkEwXlVi0bMuMSyBCzPGRE9wqokyTEEa+JEop91Gp8dAvxUAkGQJ6KB8CVr1E4m0XwrkfBwVcr5T2lx37SVVsJDaDR2gXRCEAA */
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
                        enqueue({
                          type: 'reRenderPDV',
                          params: {
                            pdvData: context.pdvDataSerialized,
                          },
                        });
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
          on: {
            MULTI_PROJECT_SELECTED: {
              actions: [
                assign({
                  multiSelectedProject: ({ event }) => event['project'],
                }),
                'renderMultiPDV',
              ],
            },
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
                  actions: [
                    'assignLoadPDVData',
                    {
                      type: 'reRenderPDV',
                      params: ({ context }) => ({
                        pdvData:
                          context.multiSelectedProject &&
                          context.pdvDataSerializedMulti
                            ? context.pdvDataSerializedMulti[
                                context.multiSelectedProject
                              ]
                            : undefined,
                      }),
                    },
                  ],
                },
              },
            },
          },
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
        NO_GRAPH_ERROR: {
          target: '.showingNoGraphError',
        },
      },
    });

    const actor = createActor(machine);
    this.webviewPanel.webview.onDidReceiveMessage((message) => {
      if (message.type === 'projectSelected') {
        actor.send({
          type: 'MULTI_PROJECT_SELECTED',
          project: message.project,
        });
      }
    });
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

  private reRenderPDV(_: unknown, params: { pdvData: string | undefined }) {
    if (params.pdvData === undefined) {
      return;
    }
    this.webviewPanel.webview.postMessage({
      type: 'reload',
      data: JSON.parse(params.pdvData),
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
    selectedProject: string | undefined,
    graphBasePath: string | undefined
  ) {
    if (data === undefined || graphBasePath === undefined) {
      return;
    }

    const projects = Object.keys(data);
    selectedProject ??= projects[0];

    const stringifiedData = JSON.stringify(
      Object.entries(data).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: JSON.parse(value) }),
        {}
      )
    );

    let html = this.loadPDVHtmlBase(graphBasePath);
    html = html.replace(
      '</head>',
      `
      <script
        src="${this.webviewPanel.webview
          .asWebviewUri(
            Uri.joinPath(
              this.context.extensionUri,
              'node_modules/@vscode-elements/elements/dist/bundled.js'
            )
          )
          .toString()}"
        type="module"
      ></script>
      </head>
      `
    );
    html = html.replace(
      '<body>',
      `
      <body>
       <div> 
      <vscode-single-select id="project-select">
        ${[
          selectedProject,
          ...projects.filter((p) => p !== selectedProject),
        ].map((p) => `<vscode-option value="${p}">${p}</vscode-option>`)}
      </vscode-single-select>
      </div>`
    );
    html = html.replace(
      '</body>',
      /*html*/ `
     
      <script>
        const vscode = acquireVsCodeApi();

        const selectBox = document.getElementById('project-select')
        selectBox.addEventListener('change', (event) => {
          const selectedValue = event.target.value;
          vscode.postMessage({
            type: 'projectSelected',
            project: selectedValue
          })
        });

        window.__pdvData = ${stringifiedData}

        const pdvService = window.renderPDV(window.__pdvData['${selectedProject}'])
            
        messages from the extension
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
      </body>
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
