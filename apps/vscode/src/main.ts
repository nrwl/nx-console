import { existsSync } from 'fs';
import { Server } from 'http';
import { join } from 'path';
import {
  commands,
  ExtensionContext,
  WebviewPanel,
  window,
  workspace,
  Terminal
} from 'vscode';

import { startServer } from './app/express-server.factory';
import { createWebViewPanel } from './app/webview.factory';

let server: Server | undefined;
let activePanel: WebviewPanel | undefined;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('extension.angular-console', async () => {
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

      if (window.activeTerminal) window.activeTerminal.hide();

      if (activePanel) {
        return activePanel.reveal();
      }

      const primaryWorkspacePath =
        workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

      let routeToLoad = '';
      if (
        primaryWorkspacePath &&
        existsSync(join(primaryWorkspacePath, 'angular.json'))
      ) {
        routeToLoad = `workspace/${encodeURIComponent(
          primaryWorkspacePath
        )}/projects`;
      }

      activePanel = createWebViewPanel(
        context,
        `http://localhost:${server.address().port}/${routeToLoad}`
      );

      let terminalToRestore: Terminal | undefined;
      activePanel.onDidChangeViewState(e => {
        if (e.webviewPanel.active) {
          terminalToRestore = window.activeTerminal;
          if (window.activeTerminal) window.activeTerminal.hide();
        } else {
          if (terminalToRestore && !window.activeTerminal) {
            terminalToRestore.show();
          }
          terminalToRestore = undefined;
        }
      });

      activePanel.onDidDispose(() => {
        activePanel = undefined;
      });

      context.subscriptions.push({
        dispose() {
          if (activePanel) {
            activePanel.dispose();
            activePanel = undefined;
          }
        }
      });
    })
  );
}

export function deactivate() {}
