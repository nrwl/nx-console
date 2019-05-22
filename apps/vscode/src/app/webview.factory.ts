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
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 4px !important;
          background: transparent !important;
          overflow: hidden !important;
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
        window.addEventListener('message', (event) => {
          const routePath = event.data.routePath;
          if (routePath && window.ANGULAR_CONSOLE_NAVIGATE_BY_URL) {
            window.ANGULAR_CONSOLE_NAVIGATE_BY_URL(routePath);
          }
        });
      </script>
    </head>

    <body class="loading">
      <angular-console-root></angular-console-root>
      <script type="text/javascript" src="runtime.js"></script><script type="text/javascript" src="polyfills.js"></script><script type="text/javascript" src="main.js"></script>
      <script>
        document.body.classList.remove('loading');
      </script>
      </body>
  </html>
  `;
}
