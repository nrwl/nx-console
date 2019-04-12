import { WorkspaceDefinition } from '@angular-console/schema';
import { readSettings } from '@angular-console/server';
import { Store } from '@nrwl/angular-console-enterprise-electron';
import { Server } from 'http';
import {
  commands,
  ExtensionContext,
  TreeView,
  ViewColumn,
  window,
  workspace
} from 'vscode';

import { startServer } from './app/start-server';
import { Workspace } from './app/tree-item/workspace';
import {
  getWorkspaceRoute,
  RevealWorkspaceRoute,
  WorkspaceRoute,
  WorkspaceRouteTitle
} from './app/tree-item/workspace-route';
import { CurrentWorkspaceTreeProvider } from './app/tree-view/current-workspace-tree-provider';
import { createWebViewPanel } from './app/webview.factory';
import { existsSync } from 'fs';
import { join } from 'path';

let server: { server: Server; store: Store };
let currentWorkspace: TreeView<Workspace | WorkspaceRoute>;

export async function activate(context: ExtensionContext) {
  server = await startServer(context);

  const workspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  const isAngularWorkspace = Boolean(
    workspacePath && existsSync(join(workspacePath, 'angular.json'))
  );

  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );

  if (workspacePath && isAngularWorkspace) {
    currentWorkspace = window.createTreeView('angularConsole', {
      treeDataProvider: CurrentWorkspaceTreeProvider.create(
        readSettings(server.store),
        workspacePath,
        context.extensionPath
      )
    });

    context.subscriptions.push(currentWorkspace);

    [
      {
        command: 'extension.angularConsoleSidePanel',
        viewColumn: ViewColumn.Beside
      },
      {
        command: 'extension.angularConsoleActivePanel',
        viewColumn: ViewColumn.Active
      }
    ].forEach(({ command, viewColumn }) => {
      context.subscriptions.push(
        commands.registerCommand(
          command,
          (
            workspaceDef: WorkspaceDefinition | undefined,
            workspaceRouteTitle: WorkspaceRouteTitle | undefined,
            onRevealWorkspaceItem: RevealWorkspaceRoute
          ) =>
            main({
              context,
              workspaceDef,
              viewColumn,
              workspaceRouteTitle,
              revealWorkspaceRoute: onRevealWorkspaceItem
            })
        )
      );
    });
  }
}

export async function deactivate() {
  if (server) {
    server.server.close();
  }
}

async function main(config: {
  context: ExtensionContext;
  viewColumn: ViewColumn;
  workspaceDef: WorkspaceDefinition | undefined;
  workspaceRouteTitle: WorkspaceRouteTitle | undefined;
  revealWorkspaceRoute: RevealWorkspaceRoute;
}) {
  const {
    context,
    viewColumn,
    workspaceDef,
    workspaceRouteTitle,
    revealWorkspaceRoute
  } = config;

  const address = server.server.address();
  if (typeof address === 'string') {
    throw new Error(`Server address format is unsupported: ${address}`);
  }

  const webViewPanel = createWebViewPanel(
    context,
    viewColumn,
    `http://localhost:${address!.port}/`,
    getWorkspaceRoute(workspaceDef, workspaceRouteTitle),
    workspaceDef,
    workspaceRouteTitle
  );
  context.subscriptions.push(webViewPanel);

  webViewPanel.onDidChangeViewState(e => {
    if (e.webviewPanel.visible) {
      revealWorkspaceRoute(currentWorkspace);
    }
  });

  return webViewPanel;
}
