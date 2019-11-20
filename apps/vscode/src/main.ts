import { EXTENSIONS } from '@angular-console/server';
import { stream } from 'fast-glob';
import { existsSync } from 'fs';
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
import { registerNgTaskCommands } from './app/ng-task/ng-task-commands';
import { NgTaskProvider } from './app/ng-task/ng-task-provider';
import { getOutputChannel } from './app/output-channel';
import {
  getTelemetry,
  initTelemetry,
  teardownTelemetry
} from './app/telemetry';
import { verifyAngularJson, verifyNodeModules } from './app/verifyWorkspace';
import { VSCodeStorage } from './app/vscode-storage';
import { revealWebViewPanel } from './app/webview';
import { WorkspaceTreeItem } from './app/workspace-tree/workspace-tree-item';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeProvider
} from './app/workspace-tree/workspace-tree-provider';

let workspaceTreeView: TreeView<WorkspaceTreeItem>;
let angularJsonTreeView: TreeView<AngularJsonTreeItem>;

let currentWorkspaceTreeProvider: WorkspaceTreeProvider;
let angularJsonTreeProvider: AngularJsonTreeProvider;

let ngTaskProvider: NgTaskProvider;
let context: ExtensionContext;

export function activate(c: ExtensionContext) {
  try {
    context = c;
    currentWorkspaceTreeProvider = WorkspaceTreeProvider.create({
      extensionPath: context.extensionPath
    });
    const store = VSCodeStorage.fromContext(context);
    initTelemetry(context, store);

    workspaceTreeView = window.createTreeView('angularConsole', {
      treeDataProvider: currentWorkspaceTreeProvider
    }) as TreeView<WorkspaceTreeItem>;
    context.subscriptions.push(workspaceTreeView);

    context.subscriptions.push(
      commands.registerCommand(
        'angularConsole.revealWebViewPanel',
        async (workspaceTreeItem: WorkspaceTreeItem) => {
          if (
            !existsSync(join(workspaceTreeItem.workspacePath, 'node_modules'))
          ) {
            const { validNodeModules: hasNodeModules } = verifyNodeModules(
              workspaceTreeItem.workspacePath
            );
            if (!hasNodeModules) {
              return;
            }
          }
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

    getTelemetry().extensionActivated(Date.now());
  } catch (e) {
    window.showErrorMessage(
      'Angular Console encountered an error when activating (see output panel)'
    );
    getOutputChannel().appendLine(
      'Angular Console encountered an error when activating'
    );
    getOutputChannel().appendLine(JSON.stringify(e));
    getTelemetry().exceptionOccured(e.message);
  }
}

export async function deactivate() {
  getTelemetry().extensionDeactivated(Date.now());
  teardownTelemetry();
}

// -----------------------------------------------------------------------------

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

  const childAngularJsonStream = stream('**/angular.json', {
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
  const { validAngularJson } = verifyAngularJson(workspacePath);
  if (!validAngularJson) {
    return;
  }

  if (!ngTaskProvider) {
    ngTaskProvider = new NgTaskProvider(workspacePath);
    tasks.registerTaskProvider('ng', ngTaskProvider);
    registerNgTaskCommands(context, ngTaskProvider);

    angularJsonTreeProvider = new AngularJsonTreeProvider(
      context,
      ngTaskProvider
    );

    angularJsonTreeView = window.createTreeView('angularConsoleJson', {
      treeDataProvider: angularJsonTreeProvider
    }) as TreeView<AngularJsonTreeItem>;
    context.subscriptions.push(angularJsonTreeView);
  } else {
    ngTaskProvider.setWorkspacePath(workspacePath);
  }

  commands.executeCommand('setContext', 'isAngularWorkspace', true);

  currentWorkspaceTreeProvider.setWorkspacePath(workspacePath);
  angularJsonTreeProvider.setWorkspacePath(workspacePath);
}
