import { existsSync } from 'fs';
import { Server } from 'http';
import { join } from 'path';
import {
  commands,
  ExtensionContext,
  WebviewPanel,
  window,
  workspace,
  ViewColumn
} from 'vscode';

import { startServer } from './app/start-server';
import { createWebViewPanel } from './app/webview.factory';

let server: Server | undefined;
let webViewPanel: WebviewPanel | undefined;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('extension.angular-console', () => main(context))
  );
  context.subscriptions.push(
    commands.registerCommand('extension.angular-console-active-panel', () =>
      main(context, ViewColumn.Active)
    )
  );
}

async function main(
  context: ExtensionContext,
  viewColumn: ViewColumn = ViewColumn.Beside
) {
  if (!server) {
    server = await startServer(context);
  }

  if (window.activeTerminal) {
    window.activeTerminal.hide();
  }
  if (webViewPanel) {
    return webViewPanel.reveal();
  }

  webViewPanel = createWebViewPanel(
    context,
    viewColumn,
    `http://localhost:${server!.address().port}/${getWorkspaceRoute()}`
  );
  context.subscriptions.push(webViewPanel);
  webViewPanel.onDidDispose(() => {
    webViewPanel = undefined;
  });
}

function getWorkspaceRoute() {
  const primaryWorkspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  if (
    primaryWorkspacePath &&
    existsSync(join(primaryWorkspacePath, 'angular.json'))
  ) {
    return `workspace/${encodeURIComponent(primaryWorkspacePath)}/projects`;
  }

  return ''; // Use angular console's default route.
}

export function deactivate() {
  if (server) {
    server.close();
    server = undefined;
  }
}
