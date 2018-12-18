'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { start } from '@angular-console/server';
import * as fs from 'fs';
import * as getPort from 'get-port';
import { Server } from 'http';
import * as path from 'path';
import {
  commands,
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace
} from 'vscode';
import { fork } from 'child_process';

let server: Server | undefined;
let activePanel: WebviewPanel | undefined;

export function activate(context: ExtensionContext) {
  let updatedNodePty = false;
  const buildNodePty = fork(
    context.asAbsolutePath('node_modules/node-pty-prebuilt/scripts/install.js'),
    undefined,
    {}
  );

  buildNodePty.on('close', () => {
    updatedNodePty = true;
  });

  const disposable = commands.registerCommand(
    'extension.angularConsole',
    async () => {
      if (!updatedNodePty) {
        return window.showInformationMessage(
          'Angular Console is updatating Node.pty for you version of VS Code. Please wait and launch again.'
        );
      }
      const primaryWorkspacePath =
        workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

      if (
        !primaryWorkspacePath ||
        !fs.existsSync(path.join(primaryWorkspacePath, 'angular.json'))
      ) {
        return window.showErrorMessage(
          'Angular Console requires your workspace be rooted to an Angular CLI 6+ project.'
        );
      }

      if (!server) {
        server = await startServer(context);
      }

      if (activePanel) {
        activePanel.reveal();
      } else {
        activePanel = createWebViewPanel();
        activePanel.iconPath = Uri.file(
          path.join(context.extensionPath, 'assets', 'extension_icon.png')
        );
        activePanel.onDidDispose(() => {
          activePanel = undefined;
        });
        activePanel.webview.html = getHtml(
          `http://localhost:${
            server.address().port
          }/workspace/${encodeURIComponent(primaryWorkspacePath)}/projects`
        );
      }
    }
  );

  context.subscriptions.push(disposable, new Disposable(deactivate));
}

export function deactivate() {
  if (activePanel) {
    activePanel.dispose();
    activePanel = undefined;
  }
  if (server) {
    server.close();
    server = undefined;
  }
}

function createWebViewPanel() {
  const panel = window.createWebviewPanel(
    'angularConsole', // Identifies the type of the webview. Used internally
    'Angular Console', // Title of the panel displayed to the user
    ViewColumn.Active, // Editor column to show the new webview panel in.
    {
      retainContextWhenHidden: true,
      enableScripts: true,
      enableCommandUris: true
    }
  );

  return panel;
}

async function startServer(context: ExtensionContext) {
  const port = await getPort({ port: 8888 });
  const store = {
    get: (key: string, defaultValue: any) =>
      context.workspaceState.get(key) || defaultValue,
    set: (key: string, value: any) => context.workspaceState.update(key, value),
    delete: (key: string) => context.workspaceState.update(key, undefined)
  };

  const s = start({
    port,
    store,
    mainWindow: null,
    staticResourcePath: path.join(
      context.extensionPath,
      'assets',
      'angular-console'
    )
  });

  console.log(`Angular Console started on port: ${port}`);

  return s;
}

function getHtml(iframeUrl: string) {
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
          overflow: hidden;
        }

        iframe {
          height: 100vh;
          width: 100vw;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
        }
      </style>
    </head>
    <body>
      <iframe
        src="${iframeUrl}"
        frameborder="0"
      ></iframe>
    </body>
  </html>
`;
}
