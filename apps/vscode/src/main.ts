import { FileUtils } from '@angular-console/server';
import { stream } from 'fast-glob';
import { existsSync, readFileSync } from 'fs';
import { Server } from 'http';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  tasks,
  TreeView,
  window,
  workspace
} from 'vscode';

import { AngularJsonTreeItem } from './app/angular-json-tree/angular-json-tree-item';
import { AngularJsonTreeProvider } from './app/angular-json-tree/angular-json-tree-provider';
import { registerNgTaskCommands } from './app/ng-task/ng-task-commands';
import { NgTaskProvider } from './app/ng-task/ng-task-provider';
import { VSCodeStorage } from './app/vscode-storage';
import { revealWebViewPanel } from './app/webview';
import { WorkspaceTreeItem } from './app/workspace-tree/workspace-tree-item';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeProvider
} from './app/workspace-tree/workspace-tree-provider';
import { migrateSettings } from './app/migrate-settings';

let server: Promise<Server>;

let workspaceTreeView: TreeView<WorkspaceTreeItem>;
let angularJsonTreeView: TreeView<AngularJsonTreeItem>;

let currentWorkspaceTreeProvider: WorkspaceTreeProvider;
let angularJsonTreeProvider: AngularJsonTreeProvider;

let ngTaskProvider: NgTaskProvider;
let context: ExtensionContext;

export function activate(c: ExtensionContext) {
  context = c;
  currentWorkspaceTreeProvider = WorkspaceTreeProvider.create({
    extensionPath: context.extensionPath
  });
  migrateSettings(context);
  const store = VSCodeStorage.fromContext(context);

  ngTaskProvider = new NgTaskProvider(new FileUtils(store));
  tasks.registerTaskProvider('ng', ngTaskProvider);

  registerNgTaskCommands(context, ngTaskProvider);

  workspaceTreeView = window.createTreeView('angularConsole', {
    treeDataProvider: currentWorkspaceTreeProvider
  }) as TreeView<WorkspaceTreeItem>;
  context.subscriptions.push(workspaceTreeView);

  angularJsonTreeProvider = new AngularJsonTreeProvider(
    context,
    ngTaskProvider
  );

  angularJsonTreeView = window.createTreeView('angularConsoleJson', {
    treeDataProvider: angularJsonTreeProvider
  }) as TreeView<AngularJsonTreeItem>;
  context.subscriptions.push(angularJsonTreeView);

  context.subscriptions.push(
    commands.registerCommand(
      'angularConsole.revealWebViewPanel',
      async (workspaceTreeItem: WorkspaceTreeItem) => {
        const port = ((await server).address() as any).port;
        revealWebViewPanel({
          workspaceTreeItem,
          context,
          getProjectEntries: () => ngTaskProvider.getProjectEntries(),
          workspaceTreeView,
          serverAddress: `http://localhost:${port}/`
        });
      }
    )
  );
  context.subscriptions.push(
    commands.registerCommand(
      LOCATE_YOUR_WORKSPACE.command!.command,
      async () => {
        return await locateAngularWorkspace();
      }
    )
  );

  const vscodeWorkspacePath =
    workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  if (vscodeWorkspacePath) {
    scanForWorkspace(vscodeWorkspacePath);
  }
}

function locateAngularWorkspace() {
  return window
    .showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        'Angular JSON': ['json']
      },
      openLabel: 'Select angular.json'
    })
    .then(value => {
      if (value && value[0]) {
        return setAngularWorkspace(join(value[0].fsPath, '..'));
      }
    });
}

function scanForWorkspace(vscodeWorkspacePath: string) {
  let currentDirectory = vscodeWorkspacePath;

  const { root } = parse(vscodeWorkspacePath);
  while (currentDirectory !== root) {
    if (existsSync(join(currentDirectory, 'angular.json'))) {
      return setAngularWorkspace(currentDirectory);
    }
    currentDirectory = dirname(currentDirectory);
  }

  const childAngularJsonStream = stream(join('**', 'angular.json'), {
    cwd: vscodeWorkspacePath,
    deep: 3,
    onlyFiles: true,
    absolute: true,
    stats: false
  })
    .on('data', (angularJsonPath: string) => {
      childAngularJsonStream.pause();

      setAngularWorkspace(join(angularJsonPath, '..'));
    })
    .on('end', () => {
      currentWorkspaceTreeProvider.endScan();
    });
}

async function setAngularWorkspace(workspacePath: string) {
  try {
    JSON.parse(readFileSync(join(workspacePath, 'angular.json')).toString());
    const { startServer } = await import('./app/start-server');
    server = startServer(context, workspacePath);
  } catch (e) {
    console.error('Invalid angular JSON', e);
    window.showErrorMessage(
      'Your angular.json file is invalid (see debug console)'
    );
    commands.executeCommand('setContext', 'isAngularWorkspace', false);
    return;
  }

  commands.executeCommand('setContext', 'isAngularWorkspace', true);

  currentWorkspaceTreeProvider.setWorkspacePath(workspacePath);
  ngTaskProvider.setWorkspacePath(workspacePath);
  angularJsonTreeProvider.setWorkspacePath(workspacePath);
}

export async function deactivate() {
  if (server) {
    (await server).close();
  }
}
