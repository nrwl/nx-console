import { existsSync } from 'fs';
import { Server } from 'http';
import { join } from 'path';
import {
  commands,
  ExtensionContext,
  WebviewPanel,
  window,
  workspace
} from 'vscode';

import { startServer } from './app/express-server.factory';
import { createWebViewPanel } from './app/webview.factory';

let server: Server | undefined;
let webViewPanel: WebviewPanel | undefined;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('extension.angular-console', () => main(context))
  );
}

async function main(context: ExtensionContext) {
  if (!server) {
    server = await startServer(context);

    context.subscriptions.push({
      dispose() {
        if (server) {
          server.close();
          server = undefined;
        }
      }
    });
  }

  if (webViewPanel) {
    return webViewPanel.reveal();
  }

  webViewPanel = createWebViewPanel(
    context,
    `http://localhost:${server.address().port}/${getWorkspaceRoute()}`
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
