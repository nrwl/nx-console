import { EXTENSIONS, FileUtils, cacheJsonFiles } from '@angular-console/server';
import { stream } from 'fast-glob';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  QuickPickItem,
  tasks,
  TreeView,
  window,
  workspace
} from 'vscode';

import { AngularJsonTreeItem } from './app/angular-json-tree/angular-json-tree-item';
import { AngularJsonTreeProvider } from './app/angular-json-tree/angular-json-tree-provider';
import { migrateSettings } from './app/migrate-settings';
import { registerNgTaskCommands } from './app/ng-task/ng-task-commands';
import { NgTaskProvider } from './app/ng-task/ng-task-provider';
import { VSCodeStorage } from './app/vscode-storage';
import { revealWebViewPanel } from './app/webview';
import { WorkspaceTreeItem } from './app/workspace-tree/workspace-tree-item';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeProvider
} from './app/workspace-tree/workspace-tree-provider';
import { initTelemetry } from './app/telemetry';

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
  initTelemetry(context, store);

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
        switch (workspaceTreeItem.route) {
          case 'Add':
            const extensions = Object.entries(EXTENSIONS).map(
              ([label, description]): QuickPickItem => ({
                label,
                description
              })
            );
            window.showQuickPick(extensions).then(selection => {
              if (!selection) {
                return;
              }

              ngTaskProvider.executeTask({
                command: 'add',
                positional: selection.label,
                flags: []
              });
            });
        }

        revealWebViewPanel({
          workspaceTreeItem,
          context,
          ngTaskProvider,
          workspaceTreeView
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
  } catch (e) {
    console.error('Invalid angular JSON', e);
    window.showErrorMessage(
      'Your angular.json file is invalid (see debug console)'
    );
    commands.executeCommand('setContext', 'isAngularWorkspace', false);
    return;
  }

  cacheJsonFiles(workspacePath);
  setInterval(() => cacheJsonFiles(workspacePath), 60000);

  commands.executeCommand('setContext', 'isAngularWorkspace', true);

  currentWorkspaceTreeProvider.setWorkspacePath(workspacePath);
  ngTaskProvider.setWorkspacePath(workspacePath);
  angularJsonTreeProvider.setWorkspacePath(workspacePath);
}

export async function deactivate() {}
