import { WorkspaceDefinition } from '@angular-console/schema';
import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';

import {
  WorkspaceRoute,
  WorkspaceRouteTitle
} from './tree-item/workspace-route';

let webviewPanel: WebviewPanel | undefined;

export function createWebViewPanel(
  context: ExtensionContext,
  viewColumn: ViewColumn,
  serverUrl: string,
  routePath: string,
  workspaceDef: WorkspaceDefinition | undefined,
  route: WorkspaceRouteTitle | undefined
) {
  let panelTitle = route || 'Angular Console';
  if (workspaceDef && workspaceDef.name) {
    panelTitle = `${workspaceDef.name} | ${route}`;
  }

  if (webviewPanel) {
    webviewPanel.title = panelTitle;
    webviewPanel.webview.postMessage({ routePath });
    webviewPanel.reveal();
  } else {
    webviewPanel = window.createWebviewPanel(
      'angular-console', // Identifies the type of the webview. Used internally
      panelTitle, // Title of the panel displayed to the user
      viewColumn, // Editor column to show the new webview panel in.
      {
        retainContextWhenHidden: true,
        enableScripts: true
      }
    );

    webviewPanel.webview.html = getIframeHtml(serverUrl, routePath);
  }

  webviewPanel.onDidDispose(() => {
    webviewPanel = undefined;
  });

  webviewPanel.iconPath = WorkspaceRoute.getIconUriForRoute(
    context.extensionPath,
    route
  );

  return webviewPanel;
}

export function getIframeHtml(serverUrl: string, routePath: string) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <base href="${serverUrl}" />

      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" type="image/x-icon" href="favicon.ico" />
      <link rel="stylesheet" type="text/css" href="assets/xterm.css" />
      <link rel="stylesheet" href="styles.css">
      <style>
        html,
        body {
          margin: 0;
          padding: 0;
          border-radius: 4px;
          background: transparent;
        }
        body {
          opacity: 1;
          transition: all 150ms cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        body.loading {
          opacity: 0;
        }
        angular-console-root {
          display: block;
          background: white;
        }
      </style>
      <script>
        window.INITIAL_ROUTE = '${routePath}';
        document.addEventListener('readystatechange', event => {
          if (event.target.readyState === 'complete') {
            document.body.classList.remove('loading');
          }
        });
        window.addEventListener('message', (event) => {
          const routePath = event.data.routePath;
          if (routePath && window.ANGULAR_CONSOLE_ROUTER) {
            window.ANGULAR_CONSOLE_CONTEXTUAL_ACTION_BAR_SERVICE.contextualActions$.next(null);
            window.ANGULAR_CONSOLE_ROUTER.navigateByUrl(routePath);
          }
        });
      </script>
    </head>

    <body class="loading">
      <angular-console-root></angular-console-root>
      <script type="text/javascript" src="runtime.js"></script><script type="text/javascript" src="polyfills.js"></script><script type="text/javascript" src="main.js"></script>
      </body>
  </html>
  `;
}
