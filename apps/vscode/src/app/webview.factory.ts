import { WorkspaceDefinition } from '@angular-console/server';
import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';

import {
  WorkspaceRoute,
  WorkspaceRouteTitle
} from './tree-item/workspace-route';

const activeWebViews = new Map<string, WebviewPanel>();

export function createWebViewPanel(
  context: ExtensionContext,
  viewColumn: ViewColumn,
  iframeUrl: string,
  workspaceDef: WorkspaceDefinition | undefined,
  route: WorkspaceRouteTitle | undefined
) {
  let panelTitle = route || 'Angular Console';
  if (workspaceDef && workspaceDef.name) {
    panelTitle = `${workspaceDef.name} | ${route}`;
  }

  const activePanel = activeWebViews.get(panelTitle);
  if (activePanel) {
    activePanel.reveal();
    return activePanel;
  }

  const panel = window.createWebviewPanel(
    'angular-console', // Identifies the type of the webview. Used internally
    panelTitle, // Title of the panel displayed to the user
    viewColumn, // Editor column to show the new webview panel in.
    {
      retainContextWhenHidden: true,
      enableScripts: true
    }
  );

  activeWebViews.set(panelTitle, panel);
  panel.onDidDispose(() => {
    if (activeWebViews.get(panelTitle) === panel) {
      activeWebViews.delete(panelTitle);
    }
  });

  panel.iconPath = WorkspaceRoute.getIconUriForRoute(
    context.extensionPath,
    route
  );
  panel.webview.html = getIframeHtml(iframeUrl);

  return panel;
}

export function getIframeHtml(iframeUrl: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Angular Console</title>
        <base href="/" />
        <link rel="icon" type="image/x-icon" href="assets/favicon.ico" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          html,
          body {
            margin: 0;
            padding: 0;
            border-radius: 4px;
            height: 100vh;
            width: 100vw;
            background: transparent;
            overflow: hidden;
          }

          iframe {
            height: 120vh;
            width: 120vw;
            transform: scale(calc(100 / 120)) perspective(1px) translateZ(0);
            backface-visibility: hidden;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            transform-origin: 0 0;
            opacity: 0;
            transition: opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          }

          iframe.fade-in {
            opacity: 1;
          }
        </style>
        <script>
          function onIframeLoad() {
            document.body.querySelector('iframe').classList.add('fade-in');
          }
        </script>
      </head>
      <body>
        <iframe
          src="${iframeUrl}"
          frameborder="0"
          onload="onIframeLoad()"
        ></iframe>
      </body>
    </html>
  `;
}
