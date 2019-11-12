import {
  cacheJsonFiles,
  EXTENSIONS,
  readAndParseJson
} from '@angular-console/server';
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
import { getTelemetry, initTelemetry } from './app/telemetry';
import { VSCodeStorage } from './app/vscode-storage';
import { revealWebViewPanel } from './app/webview';
import { WorkspaceTreeItem } from './app/workspace-tree/workspace-tree-item';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeProvider
} from './app/workspace-tree/workspace-tree-provider';
import { getOutputChannel } from './app/output-channel';

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

    ngTaskProvider = new NgTaskProvider();
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
          if (
            !existsSync(join(workspaceTreeItem.workspacePath, 'node_modules'))
          ) {
            window.showErrorMessage(
              'Angular Console requires your workspace have a node_modules directory. Run npm install.'
            );
            return;
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
  } catch (e) {
    window.showErrorMessage(
      'Angular Console encountered an error when activating (see output panel)'
    );

    getOutputChannel().appendLine(
      'Angular Console encountered an error when activating'
    );
    getOutputChannel().appendLine(JSON.stringify(e));
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
    readAndParseJson(join(workspacePath, 'angular.json'));
  } catch (e) {
    window.showErrorMessage(
      'Invalid angular.json (see output panel for details)'
    );
    getOutputChannel().appendLine(
      'Invalid angular JSON: ' + join(workspacePath, 'angular.json')
    );

    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exceptionOccured(stringifiedError);
  }

  setTimeout(() => {
    cacheWorkspaceNodeModulesJsons(workspacePath);
  }, 0);
  setInterval(() => cacheWorkspaceNodeModulesJsons(workspacePath), 60000);

  commands.executeCommand('setContext', 'isAngularWorkspace', true);

  currentWorkspaceTreeProvider.setWorkspacePath(workspacePath);
  ngTaskProvider.setWorkspacePath(workspacePath);
  angularJsonTreeProvider.setWorkspacePath(workspacePath);
}

export async function deactivate() {}

function cacheWorkspaceNodeModulesJsons(workspacePath: string) {
  if (!existsSync(join(workspacePath, 'node_modules'))) {
    getOutputChannel().appendLine(
      'Tried to cache node_modules but directory was not present. Run npm install'
    );
    return;
  }

  try {
    cacheJsonFiles(workspacePath);
  } catch (e) {
    window.showErrorMessage(
      'Angular Console encountered an error when scanning node_modules'
    );
    getOutputChannel().appendLine('Error parsing node_modules ');

    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exceptionOccured(stringifiedError);
  }
}
