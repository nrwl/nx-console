import { WorkspaceDefinition } from '@angular-console/schema';
import { FileUtils } from '@angular-console/server';
import { stream } from 'fast-glob';
import { existsSync } from 'fs';
import { Server } from 'http';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  tasks,
  TreeView,
  ViewColumn,
  window,
  workspace
} from 'vscode';

import { getStoreForContext } from './app/get-store-for-context';
import { NgTaskProvider } from './app/ng-task-provider/ng-task-provider';
import { Workspace } from './app/tree-item/workspace';
import {
  getWorkspaceRoute,
  RevealWorkspaceRoute,
  WorkspaceRoute,
  WorkspaceRouteTitle
} from './app/tree-item/workspace-route';
import {
  CurrentWorkspaceTreeProvider,
  LOCATE_YOUR_WORKSPACE
} from './app/tree-view/current-workspace-tree-provider';
import {
  AngularJsonTreeItem,
  AngularJsonTreeProvider as ProjectsTreeProvider
} from './app/tree-view/projects-tree-provider';
import { createWebViewPanel } from './app/webview.factory';
import { registerNgCliCommands } from './app/ng-cli-commands';

let server: Promise<Server>;

let currentWorkspaceTreeView: TreeView<Workspace | WorkspaceRoute>;
let projectsTreeView: TreeView<AngularJsonTreeItem>;

let currentWorkspaceTreeProvider: CurrentWorkspaceTreeProvider;
let projectsTreeProvider: ProjectsTreeProvider;

let taskProvider: NgTaskProvider;

export function activate(context: ExtensionContext) {
  currentWorkspaceTreeProvider = CurrentWorkspaceTreeProvider.create({
    extensionPath: context.extensionPath
  });

  taskProvider = new NgTaskProvider(new FileUtils(getStoreForContext(context)));
  tasks.registerTaskProvider('ng', taskProvider);

  registerNgCliCommands(context, taskProvider);

  currentWorkspaceTreeView = window.createTreeView('angularConsole', {
    treeDataProvider: currentWorkspaceTreeProvider
  }) as TreeView<Workspace | WorkspaceRoute>;
  context.subscriptions.push(currentWorkspaceTreeView);

  projectsTreeProvider = new ProjectsTreeProvider(context, taskProvider);

  projectsTreeView = window.createTreeView('angularConsoleJson', {
    treeDataProvider: projectsTreeProvider
  }) as TreeView<AngularJsonTreeItem>;
  context.subscriptions.push(projectsTreeView);

  context.subscriptions.push(
    commands.registerCommand(
      'extension.angularConsole',
      (
        workspaceDef: WorkspaceDefinition | undefined,
        workspaceRouteTitle: WorkspaceRouteTitle | undefined,
        onRevealWorkspaceItem: RevealWorkspaceRoute
      ) =>
        main({
          context,
          workspaceDef,
          viewColumn: ViewColumn.Active,
          workspaceRouteTitle,
          revealWorkspaceRoute: onRevealWorkspaceItem
        })
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      LOCATE_YOUR_WORKSPACE.command!.command,
      async () => {
        return await window
          .showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
              'Angular JSON': ['json']
            },
            openLabel: 'Select an angular.json file'
          })
          .then(value => {
            if (value && value[0]) {
              return setAngularWorkspace(context, join(value[0].fsPath, '..'));
            }
          });
      }
    )
  );

  const workspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  if (!workspacePath) {
    throw new Error('Could not find VsCode workspace path');
  }

  let currentDirectory = workspacePath;

  const { root } = parse(workspacePath);
  while (currentDirectory !== root) {
    if (existsSync(join(currentDirectory, 'angular.json'))) {
      return setAngularWorkspace(context, currentDirectory);
    }
    currentDirectory = dirname(currentDirectory);
  }

  const childAngularJsonStream = stream(join('**', 'angular.json'), {
    cwd: workspacePath,
    deep: 3,
    onlyFiles: true,
    absolute: true,
    stats: false
  })
    .on('data', (angularJsonPath: string) => {
      childAngularJsonStream.pause();

      setAngularWorkspace(context, join(angularJsonPath, '..'));
    })
    .on('end', () => {
      currentWorkspaceTreeProvider.endScan();
    });
}

function setAngularWorkspace(context: ExtensionContext, workspacePath: string) {
  currentWorkspaceTreeProvider.setWorkspacePath(workspacePath);
  taskProvider.setWorkspacePath(workspacePath);

  import('./app/start-server').then(({ startServer }) => {
    server = startServer(context, workspacePath);
  });
}

export async function deactivate() {
  if (server) {
    (await server).close();
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

  const address = (await server).address();
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
      revealWorkspaceRoute(currentWorkspaceTreeView);
    }
  });

  return webViewPanel;
}
