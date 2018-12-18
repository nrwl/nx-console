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
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
  Disposable
} from 'vscode';
import { authUtils } from '@nrwl/angular-console-enterprise-electron';
import { Subject } from 'rxjs';

const IFRAME_URL_SET = 'iframe-url-set';
const IFRAME_ID = 'iframe';

let server: Server | undefined;
let activePanel: WebviewPanel | undefined;
let lastIframeUrl = '';

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand(
    'extension.angularConsole',
    async () => {
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
        activePanel.webview.onDidReceiveMessage(
          (message: { command: string; payload: any }) => {
            switch (message.command) {
              case IFRAME_URL_SET:
                lastIframeUrl = message.payload;
            }
          }
        );
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
    authenticatorFactory: getAuthenticator,
    staticResourcePath: path.join(
      context.extensionPath,
      'assets',
      'angular-console'
    )
  });

  console.log(`Angular Console started on port: ${port}`);

  return s;
}

function getAuthenticator(): authUtils.AuthenticatorFactory {
  return (url: string) => {
    activePanel = activePanel || createWebViewPanel();

    const panel = activePanel;
    const urlToRestore = lastIframeUrl;
    const redirectSubject = new Subject<string>();

    panel.onDidDispose(() => {
      if (!redirectSubject.isStopped) {
        redirectSubject.error(new Error('User terminated authentication'));
      }
    });

    redirectSubject.subscribe(
      () => {},
      () => {},
      () => {
        panel.webview.html = getHtml(urlToRestore);
        disposable.dispose();
      }
    );

    panel.webview.html = getHtml(url);
    const disposable = panel.webview.onDidReceiveMessage(
      (message: { command: string; payload: any }) => {
        switch (message.command) {
          case IFRAME_URL_SET:
            redirectSubject.next(message.payload);
        }
      }
    );

    return redirectSubject;
  };
}

function getHtml(iframeUrl: string) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Angular Console</title>
      <base href="/" />

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
        id="${IFRAME_ID}"
        src="${iframeUrl}"
        frameborder="0"
      ></iframe>

      <script>
        const vscode = acquireVsCodeApi();
        const iframe = document.getElementById('${IFRAME_ID}');
        iframe.onload= function() {
          vscode.postMessage({
            command: '${IFRAME_URL_SET}',
            payload: iframe.src
          });
        }
      </script>
    </body>
  </html>
`;
}
