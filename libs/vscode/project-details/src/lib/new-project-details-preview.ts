import { PDVData } from '@nx-console/shared/types';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getPDVData } from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import {
  commands,
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
import { handleGraphInteractionEventBase } from '@nx-console/vscode/graph-base';
import { getGraphWebviewManager } from '@nx-console/vscode/project-graph';

export class NewProjectDetailsPreview implements ProjectDetailsPreview {
  private webviewPanel: WebviewPanel;

  projectRoot: string | undefined;

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
        reRenderPDV: (_: unknown, params: { pdvData: string | undefined }) =>
          this.reRenderPDV(params.pdvData),
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
        renderNoGraphError: ({ context }) =>
          this.renderNoGraphError(context.errorMessage),
        assignLoadPDVData: assign(({ context, event }) => {
          const multiProjects = Object.keys(
            event['output'].pdvDataSerializedMulti ?? {}
          );
          const multiSelectedProject =
            context.multiSelectedProject ??
            (multiProjects.length > 0 ? multiProjects[0] : undefined);
          return {
            ...event['output'],
            multiSelectedProject,
          };
        }),
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
      /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwBEw8BDASwBtYBiABQIDUB9AgQQBVWmAZAeVYJMAygFUAwmICiQoQG0ADAF1EKdLDJ4y6AHYqQAD0QBWAGwA6ABxGAnNaPyT8gIwAmRxesAaEAE9EAdicnM2t5IwAWFyD-cKCLAGYAX0TvNCxcQmJyKjpGFg4uPgEmSQAlUt5ShWUkEGQ1DS1dWsMEeJczI3sg+VCjeOsLcP9vPwQneSGzfxdQl3mLBIcTZNSMbHwiUkoaemY2Th5+QQBZEW52AElhcSkZar169U0dPVaAWhMjMyd-f3twuEjC5whYnNYRr5EE5hhYzJFXNEEl8Vik6usMltsjQAHK8JgAcVKrFoAAkSuVKg9ak9Gq8WtCgfCor94v1-PE-otRoh2nCwiYLPIXPI2YKTP5Vuj0pssjszGRtI0SBRuOgSBBFVBqBAdGAFdoAG7oADW+rSG0y2yoBuVqvVmu0UAQiuNOBIL201WpqmeTTeiHeTiMcP6VnioqGQRcFh5CA8ZhcM2sJhc9lFEdMUotmLlNtgAAt0AB3LV7ailSQAMUrQlJPrqDU9AbaNh+i0WdhiLK8UIQM3kZhMKaT9hmHPm2YxsutsDMhZLZcYZlQYAAZqvC1qdXqDcazWYczPsfOi6WnXsV+vNwWtS6jeh3Z7vUpHk3-QyEOFbImYdZ4iYTjDhYgpGHGIZwoB4TDiKIbWGmU4ylaJ4LueUB7CcACuFCaNQZwXNctAVAAUpIYjsMIkjcGR7CSAQDa0s2n6AtYibAhCHGLPIfwmHGvxGMEAEQu0-hhPI8jDIhlpYvKqFLgwWE4WQFbVrW9avjS770qArRsqxTidgZUYIrxfbBsCZi9BMXT+AkLIuFJuazqei4XowimaFeG5wLeTo7to+quqa5rTshslnvJHlkF5N53kFT5NC+NS+nSzQ6Yg36sVE34OHMXwgeEfGRIO4nWNB8QWG4JhApKaJHmF+YRU6kioBgqAqTW0jqcljZ+tpBi8m2RmdkY3bRJCYxBJy8JWMMjgSWJSR1aFMmNa5UAtW1MU+duuoBXuwWHiteZznJzWtegqDbVuTr3m6HqJUoDFaWlA1fvBljxDCbL+BK8QVU4fHid84Siv+wJfBMDnLUhq2nU1UA4ugBKoCQyAFptl0dWpz19a9ulDR2tjtLYoLDHGX0dPYAGcr0v0mBK4SOce4XrUjKNoxjF1Xau3k3dqe2BQ+B71XDLloezqPo5jPPXjtt3xQ9OhJW+eMtt+HQJDCDjpq4CR8UKzIitVXxpjES1oto6AQHAjzHbOqupS27wuF9llfLEbhBBMEJxu8sSWf0BnhBVkyAlmMPSSdtqaCqaoalqjtMelCBBgk7sRK4gE9L7fZRP4Q7OBGbKjiBlXMw18PrXsScfinX3BMNHijQi4JxkC4TwqmIemLYlUSqiayw9HZ3ocuZAQBQYC1-1un+KxyZVQZgRsvEcYMx0xt-K7MLzzGFdi6Pl687FToz-jGWLCEMagjEHixAMcaBFTwrAbMzhAktQ9R85R-udhmhz4tgbu2DwRlYgmT4jGb4VgV7WF+ByeB0Nv5ORQgjDCADooTynkAz8nIF6zFmLZf8SZ4FFX-IXGEHhAKzASNYA+I90H-yUtdXyUBcEp1BHCeCQwQzzHmBJPiER4iWAhMMYGtkGYMN-gjGWHC3ogKbl2Vufw4wWECGxICxCHDiQqtItB60ZYKkntPTSas8Hz2mIQhmy8nAlyBrZEIdghgDH7s4fRrM0JGJPvLdhZinbMSvjw2+oIyp2NjGZVwWV4FhO-CYdoUQPFrQlsjKWXM2ryN0kEUBHgSGkyGBNDK5g3DCRjMQgRMIklVxSRzaW3NjE4P8cnBRljF7QQlKYVMcY0ydw-txXoSYQ52CqeLLUktObeLlvzTJl9uE3wqoEbiEZ-gUwkmYL64lRKLHwdBZIyQgA */
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
                assign(({ context, event }) => ({
                  ...context,
                  multiSelectedProject: event['project'],
                })),
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
                    enqueueActions(({ context, enqueue }) => {
                      if (context.resultType === 'SUCCESS_MULTI') {
                        enqueue({
                          type: 'reRenderPDV',
                          params: {
                            pdvData:
                              context.multiSelectedProject &&
                              context.pdvDataSerializedMulti
                                ? context.pdvDataSerializedMulti[
                                    context.multiSelectedProject
                                  ]
                                : undefined,
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

    const interactionEventListener =
      this.webviewPanel.webview.onDidReceiveMessage(async (event) => {
        if (event.type === 'projectSelected') {
          actor.send({
            type: 'MULTI_PROJECT_SELECTED',
            project: event.project,
          });
          return;
        }
        const handled = await handleGraphInteractionEventBase(event);
        if (handled) return;

        if (event.type === 'open-project-graph') {
          getGraphWebviewManager().focusProject(event.payload.projectName);
          return;
        }

        if (event.type === 'open-task-graph') {
          getGraphWebviewManager().focusTarget(
            event.payload.projectName,
            event.payload.targetName
          );
          return;
        }
      });
    actor.start();

    const workspaceRefreshListener = onWorkspaceRefreshed(() => {
      actor.send({ type: 'REFRESH' });
    });

    const viewStateListener = this.webviewPanel.onDidChangeViewState(
      ({ webviewPanel }) => {
        commands.executeCommand(
          'setContext',
          'projectDetailsViewVisible',
          webviewPanel.visible
        );
      }
    );

    this.webviewPanel.onDidDispose(() => {
      interactionEventListener.dispose();
      viewStateListener.dispose();
      workspaceRefreshListener?.dispose();
      commands.executeCommand('setContext', 'projectDetailsViewVisible', false);
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

            const vscode = acquireVsCodeApi()
            window.externalApi.graphInteractionEventListener = (message) => {
              vscode.postMessage(message);
            }
            
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
    if (
      data === undefined ||
      graphBasePath === undefined ||
      selectedProject === undefined
    ) {
      return;
    }

    const projects = Object.keys(data);

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
       <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;"> 
       <p>
      Project: 
       </p>
      <vscode-single-select id="project-select">
        ${[
          selectedProject,
          ...projects.filter((p) => p !== selectedProject),
        ].map((p) => `<vscode-option value="${p}">${p}</vscode-option>`)}
      </vscode-single-select>
      </div>
      <vscode-divider></vscode-divider>
      
      `
    );
    html = html.replace(
      '</body>',
      /*html*/ `
     
      <script>
        const vscode = acquireVsCodeApi();

        window.externalApi.graphInteractionEventListener = (message) => {
            vscode.postMessage(message);
        }

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
    this.webviewPanel.webview.html = `<html><body>
      <h2>Nx Console could not load the Project Details View. </h2>
              <h4>
              This is most likely because local dependencies are not installed. <br/>
              Make sure to run npm/yarn/pnpm/bun install and refresh the workspace using the button in the editor toolbar.
              </h4>

              ${
                error
                  ? `
              <h4>
                  The following error occurred: <br/>
                  <pre>${error}</pre>
                  See idea.log for more details.
              </h4>
              `
                  : ''
              }
    </body></html>`;
  }

  onDispose(callback: () => void): void {
    this.webviewPanel.onDidDispose(() => {
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
