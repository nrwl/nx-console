import { handleGraphInteractionEventBase } from '@nx-console/vscode/graph-base';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getPDVData } from '@nx-console/vscode/nx-workspace';
import { getGraphWebviewManager } from '@nx-console/vscode/project-graph';
import { join } from 'path';
import {
  commands,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from 'vscode';
import { assign, createActor, enqueueActions, fromPromise } from 'xstate';
import { machine } from './pdv-state-machine';
import { ProjectDetailsPreview } from './project-details-preview';

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

    const actor = createActor(
      machine.provide({
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
      })
    );

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
