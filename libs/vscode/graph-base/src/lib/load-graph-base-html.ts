import { workspaceDependencyPath } from '@nx-console/shared/npm';
import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Uri, Webview, window } from 'vscode';

export async function loadGraphBaseHtml(webview: Webview): Promise<string> {
  const workspacePath = await getNxWorkspacePath();
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath || !existsSync(nxPath)) {
    window.showErrorMessage(
      'Error loading the nx graph. Did you run npm/yarn/pnpm install?'
    );
    return '';
  }
  const graphPath = join(nxPath, 'src', 'core', 'graph');

  const asWebviewUri = (path: string) =>
    webview.asWebviewUri(Uri.file(join(graphPath, path))).toString();

  let html = readFileSync(join(graphPath, 'index.html'), 'utf-8');
  html = html.replace(/environment.js/g, asWebviewUri('environment.js'));
  html = html.replace(/polyfills.js/g, asWebviewUri('polyfills.js'));
  html = html.replace(/runtime.js/g, asWebviewUri('runtime.js'));
  html = html.replace(/styles.js/g, asWebviewUri('styles.js'));
  html = html.replace(/styles.css/g, asWebviewUri('styles.css'));
  html = html.replace(/main.js/g, asWebviewUri('main.js'));

  html = html.replace(
    '</head>',
    /*html*/ `
  <style>
    #sidebar {
      display: none;
    }

    [data-cy="no-tasks-selected"] {
      display: none;
    }

    body {
      background-color: var(--vscode-editor-background) !important;
      color: var(--vscode-editor-foreground) !important;
    }
    html {
      font-size: var(--vscode-font-size) !important;
    }
  </style>
  </head>
  `
  );

  html = html.replace(
    '</head>',
    /*html*/ `
  <script> 
    // communication with server through vscode api 
    // we send requests to vscode with an id 
    // as responses come in, we compare ids and resolve the promise
    const vscode = acquireVsCodeApi();
    const pendingRequests = new Map();

    window.externalApi = {}
    window.addEventListener('message', ({ data }) => {
      const { type, id, payload } = data;
      
      if (type.startsWith('request') && id && pendingRequests.has(id)) {
        const payloadParsed = JSON.parse(payload);
        const resolve = pendingRequests.get(id);
        resolve(payloadParsed);
        pendingRequests.delete(id);
      }
    });

    function sendRequest(type, payload) {
      return new Promise((resolve) => {
        const id = generateUniqueId();
        pendingRequests.set(id, resolve);
        vscode.postMessage({ type, id, payload });
      });
    }

    function generateUniqueId() {
      return Math.random().toString(36).substr(2, 9);
    }

    window.externalApi.loadProjectGraph = () => sendRequest('requestProjectGraph');
    window.externalApi.loadTaskGraph = () => sendRequest('requestTaskGraph');
    window.externalApi.loadExpandedTaskInputs = (taskId) => sendRequest('requestExpandedTaskInputs', taskId);
    window.externalApi.loadSourceMaps = () => sendRequest('requestSourceMaps');

    // set up interaction events (open project config, file click, ...)
    window.externalApi.graphInteractionEventListener = (message) => {
      vscode.postMessage(message)
    }

    window.environment = "nx-console"

    // waiting for nx graph to be ready
    async function waitForRouter() {
        if (window.externalApi && window.externalApi.router) {
            return;
        }
        const waitForRouterPromise = () => {
            return new Promise((resolve) => {
                const observer = new MutationObserver((mutationsList, observer) => {
                    if (window.externalApi && window.externalApi.router) {
                        observer.disconnect();
                        resolve();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            });
        };
        await waitForRouterPromise();
    }
    window.waitForRouter = waitForRouter;
  </script>

  </head>
  `
  );

  return html;
}
