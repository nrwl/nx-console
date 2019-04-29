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
        enableScripts: true,
        enableCommandUris: true
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

export function getIframeHtml(_serverUrl: string, _routePath: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    window.zESettings = {
      webWidget: {
        chat: {
          title: {
            '*': 'Chat with Nrwl'
          },
          offlineForm: {
            greeting: {
              '*': "We aren't online right now, please leave a message!"
            }
          }
        }
      }
    };

    setTimeout(() => {
      window.zE('webWidget', 'open');
    }, 2000);
  </script>
  
  <script src="https://static.zdassets.com/ekr/snippet.js?key=1e1b6615-5309-4b5b-a4ef-d3f384181487" id="ze-snippet"></script>
</head>
<body></body>
</html>
  `;
}
