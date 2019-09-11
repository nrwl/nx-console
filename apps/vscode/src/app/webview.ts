import {
  ExtensionContext,
  TreeView,
  ViewColumn,
  WebviewPanel,
  window
} from 'vscode';

import { ProjectDef } from './ng-task/ng-task-definition';
import {
  getWorkspaceRoute,
  WorkspaceRouteTitle,
  WorkspaceTreeItem
} from './workspace-tree/workspace-tree-item';

let webviewPanel: WebviewPanel | undefined;

interface RevealWebViewPanelConfig {
  context: ExtensionContext;
  viewColumn: ViewColumn;
  port: number;
  workspaceTreeItem: WorkspaceTreeItem;
  getProjectEntries(): [string, ProjectDef][];
  workspaceTreeView: TreeView<WorkspaceTreeItem>;
}

export async function revealWebViewPanel({
  context,
  viewColumn,
  port,
  getProjectEntries,
  workspaceTreeItem,
  workspaceTreeView
}: RevealWebViewPanelConfig) {
  const { workspacePath, projectName, label } = workspaceTreeItem;

  const workspaceRoute = await getWorkspaceRoute(
    workspacePath,
    getProjectEntries,
    workspaceTreeItem.label,
    projectName
  );

  if (!workspaceRoute) {
    return;
  }

  const webViewPanel = createWebViewPanel(
    context,
    viewColumn,
    `http://localhost:${port}/`,
    workspaceRoute,
    label
  );
  context.subscriptions.push(webViewPanel);

  webViewPanel.onDidChangeViewState(e => {
    if (e.webviewPanel.visible) {
      workspaceTreeItem.revealWorkspaceRoute(workspaceTreeView);
    }
  });

  return webViewPanel;
}

export function createWebViewPanel(
  context: ExtensionContext,
  viewColumn: ViewColumn,
  serverUrl: string,
  routePath: string,
  route: WorkspaceRouteTitle | undefined
) {
  const panelTitle = route || 'Angular Console';

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

  webviewPanel.iconPath = WorkspaceTreeItem.getIconUriForRoute(
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
      <link rel="stylesheet" href="styles.css">

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

    <body >
      <angular-console-root></angular-console-root>
      <script type="text/javascript" src="runtime.js"></script><script type="text/javascript" src="polyfills.js"></script><script type="text/javascript" src="main.js"></script>
      </body>
  </html>
  `;
}
