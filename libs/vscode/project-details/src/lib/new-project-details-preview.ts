import { PDVData } from '@nx-console/shared/types';
import { getPDVData } from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import {
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
} from 'vscode';
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
      /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwBEw8BDASwBtYBiABQIDUB9AgQQBVWmAZAeVYJMAygFUAwmICiQoQG0ADAF1EKdLDJ4y6AHYqQAD0QBWAOwAaEAE9EADnkBOAHQAWEwDYTDowCZnN+zYAjAC+wRZoWLiExORUdIwsHFx8AkySAErpvOkKykggyGoaWrr5hgimFtYIgYE2zo42AMxutU32TU0mNiah4RjY+ESklDT0zGycPPyCALIi3OwAksLiUjK5eoXqmjp65ZVWiM72gY4e8kYntSa3gb1hBQNRw7E0AHK8TADi6ay0AAk0plspt8ttinsyohvPZvI4bt5Lk0bD1vLUqohAt4+k9IkMYqNHGRtMUSBRuOgSBASVBqBAdGBidoAG7oADWTIig2iIyozLJFKpNO0UAQJLZOBIu20uTBqh2JX2WOc8ka8hsplVbjhmrcmIQ3haLg8zhabnaJi6uO5L0J-NgAAt0AB3WnjajpSQAMS9QgB8oKRRlyoQTSMZ2xgQ19069nkJnsBps6Mc9ncnnsPj8ARtzwJfNgjidrvdjEcqDAADNK07afTGcy2ZzHLaC29i863aLxhXq7XHbTxaz0FKZXKlFtg0roQhrgjXIEmicTIFTs4jAa3P5GlmlxH5E0jYEjHn8byOyXu1BJKgMKhPT6-QHJ+Dp1DQOUj04Tsv1+jnFaLMDVqdNHE6Volw6LobA8M8eVeIkr1pW97z7Gs4EHUUG20JkJQ5Ll8wvJCuxQu90FQdCByHfCxxKCc8gVSFSk-Y4LQRFpozXAJEwjED5DcIxHG8K4jHaCN0RxXFtHQCA4C2IjEKoKdFQ-AxECTI45yaRoRJ8dEelMETfHgu1CwFTRyUpalaRU5jQzcbwDRaNVw1EkxYSMIyWlM9sSNLHtGDskNZyaQ8EXRGMrXaBNNOqLyhJMZxvDsTUjDcRzLl84iHVIwKGGJCAKDAYKZ1YsNV3OVozThIw7BMdKDXcHS-FXdEgOXDdsqUotkPyqjMNst9VJY9S5zsRo3AEuqU3sVxAKaZMl0cbomnuIwOkRU9HjbHLeryqBxlmABXChNFKtSvyS8CdStWCMu3BNNy0wCbBcI0gjqDKTiuZxuvtfaApvcjUAu0byhSs5f2uZLAkAtdnuqTaEXkSSErCiMQh2xSAc7IHUIowrirB0NwzVQ8URzDdHPsNxnBApc3vqQSrQcOnEwefpzx6vHrwJyjKwwutRRJ2cNycI0wu3CNPBS8wtNqHc4ZEuxl3kATsX+8y+qgd50G+VASGQR1+dF8rDmqJdIz8Gq5tpxW3FCUIgA */
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
          ${projects.map(
            (p) => `<vscode-option value="${p}">${p}</vscode-option>`
          )}
        </vscode-single-select>
      </div>`
    );
    html = html.replace(
      '</body>',
      `
     
      <script>
        // document.getElementById('vscode-single-select').value = '${selectedProject}';

        const vscode = acquireVsCodeApi();
        window.__pdvData = ${stringifiedData}

        console.log(window.__pdvData)

        const pdvService = window.renderPDV(window.__pdvData['${selectedProject}'])
            
        // // messages from the extension
        //   window.addEventListener('message', event => {
        //   const message = event.data; 
        //   if(message.type === 'reload') {
        //     pdvService.send({
        //       type: 'loadData',
        //       ...message.data,
        //     });
        //   }
        // });

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
