import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  tasks,
  TreeView,
  window,
  workspace,
  Uri
} from 'vscode';

import { WorkspaceJsonTreeItem } from './app/workspace-json-tree/workspace-json-tree-item';
import { WorkspaceJsonTreeProvider } from './app/workspace-json-tree/workspace-json-tree-provider';
import { NxCommandsTreeItem } from './app/nx-commands/nx-commands-tree-item';
import { NxCommandsTreeProvider } from './app/nx-commands/nx-commands-provider';
import { registerCliTaskCommands } from './app/cli-task/cli-task-commands';
import { CliTaskProvider } from './app/cli-task/cli-task-provider';
import { getOutputChannel } from './app/output-channel';
import {
  getTelemetry,
  initTelemetry,
  teardownTelemetry
} from './app/telemetry';
import { VSCodeStorage } from './app/vscode-storage';
import { revealWebViewPanel } from './app/webview';
import { WorkspaceTreeItem } from './app/workspace-tree/workspace-tree-item';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeProvider
} from './app/workspace-tree/workspace-tree-provider';
import { verifyNodeModules } from './app/verify-workspace/verify-node-modules';
import { verifyWorkspace } from './app/verify-workspace/verify-workspace';
import { registerNxCommands } from './app/nx-task/nx-task-commands';

let workspaceTreeView: TreeView<WorkspaceTreeItem>;
let workspaceJsonTreeView: TreeView<WorkspaceJsonTreeItem>;
let affectedTreeView: TreeView<NxCommandsTreeItem>;

let currentWorkspaceTreeProvider: WorkspaceTreeProvider;
let workspaceJsonTreeProvider: WorkspaceJsonTreeProvider;

let cliTaskProvider: CliTaskProvider;
let context: ExtensionContext;

export function activate(c: ExtensionContext) {
  try {
    const startTime = Date.now();
    context = c;
    currentWorkspaceTreeProvider = WorkspaceTreeProvider.create({
      extensionPath: context.extensionPath
    });
    const store = VSCodeStorage.fromContext(context);
    initTelemetry(store);

    workspaceTreeView = window.createTreeView('nxConsole', {
      treeDataProvider: currentWorkspaceTreeProvider
    }) as TreeView<WorkspaceTreeItem>;
    context.subscriptions.push(workspaceTreeView);

    context.subscriptions.push(
      commands.registerCommand(
        'nxConsole.revealWebViewPanel',
        async (workspaceTreeItem: WorkspaceTreeItem, contextMenuUri?: Uri) => {
          if (
            !existsSync(
              join(workspaceTreeItem.workspaceJsonPath, '..', 'node_modules')
            )
          ) {
            const { validNodeModules: hasNodeModules } = verifyNodeModules(
              join(workspaceTreeItem.workspaceJsonPath, '..')
            );
            if (!hasNodeModules) {
              return;
            }
          }
          revealWebViewPanel({
            workspaceTreeItem,
            context,
            cliTaskProvider,
            workspaceTreeView,
            contextMenuUri,
          });
        }
      )
    );
    context.subscriptions.push(
      commands.registerCommand(
        LOCATE_YOUR_WORKSPACE.command!.command,
        async () => {
          return await manuallySelectWorkspaceDefinition();
        }
      )
    );
    const vscodeWorkspacePath =
      workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

    if (vscodeWorkspacePath) {
      scanForWorkspace(vscodeWorkspacePath);
    }

    getTelemetry().extensionActivated((Date.now() - startTime) / 1000);
  } catch (e) {
    window.showErrorMessage(
      'Nx Console encountered an error when activating (see output panel)'
    );
    getOutputChannel().appendLine(
      'Nx Console encountered an error when activating'
    );
    getOutputChannel().appendLine(JSON.stringify(e));
    getTelemetry().exception(e.message);
  }
}

export async function deactivate() {
  getTelemetry().extensionDeactivated();
  teardownTelemetry();
}

// -----------------------------------------------------------------------------

function manuallySelectWorkspaceDefinition() {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    return window
      .showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select workspace directory'
      })
      .then(value => {
        if (value && value[0]) {
          const selectedDirectory = value[0].fsPath;
          return setWorkspace(
            join(
              selectedDirectory,
              existsSync(join(selectedDirectory, 'angular.json'))
                ? 'angular.json'
                : 'workspace.json'
            )
          );
        }
      });
  } else {
    window.showInformationMessage(
      'Cannot select an Nx workspace when no folders are opened in the explorer'
    );
  }
}

function scanForWorkspace(vscodeWorkspacePath: string) {
  let currentDirectory = vscodeWorkspacePath;

  const { root } = parse(vscodeWorkspacePath);
  while (currentDirectory !== root) {
    if (existsSync(join(currentDirectory, 'angular.json'))) {
      return setWorkspace(join(currentDirectory, 'angular.json'));
    }
    if (existsSync(join(currentDirectory, 'workspace.json'))) {
      return setWorkspace(join(currentDirectory, 'workspace.json'));
    }
    currentDirectory = dirname(currentDirectory);
  }
}

async function setWorkspace(workspaceJsonPath: string) {
  const { validWorkspaceJson } = verifyWorkspace(dirname(workspaceJsonPath));
  if (!validWorkspaceJson) {
    return;
  }

  if (!cliTaskProvider) {
    cliTaskProvider = new CliTaskProvider(workspaceJsonPath);
    registerNxCommands(context, cliTaskProvider);
    tasks.registerTaskProvider('ng', cliTaskProvider);
    tasks.registerTaskProvider('nx', cliTaskProvider);
    registerCliTaskCommands(context, cliTaskProvider);

    workspaceJsonTreeProvider = new WorkspaceJsonTreeProvider(
      context,
      cliTaskProvider
    );

    workspaceJsonTreeView = window.createTreeView('nxProjects', {
      treeDataProvider: workspaceJsonTreeProvider
    }) as TreeView<WorkspaceJsonTreeItem>;
    context.subscriptions.push(workspaceJsonTreeView);

    const affectedTreeProvider = NxCommandsTreeProvider.create(context);

    affectedTreeView = window.createTreeView('nxCommands', {
      treeDataProvider: affectedTreeProvider
    }) as TreeView<NxCommandsTreeItem>;
    context.subscriptions.push(affectedTreeView);
  } else {
    cliTaskProvider.setWorkspaceJsonPath(workspaceJsonPath);
  }

  const isNxWorkspace = existsSync(join(workspaceJsonPath, '..', 'nx.json'));
  const isAngularWorkspace = workspaceJsonPath.endsWith('angular.json');
  const store = VSCodeStorage.fromContext(context);
  const enableGenerateFromContextMenuSetting = store.get('enableGenerateFromContextMenu');
  const isGenerateFromContextMenuEnabled = enableGenerateFromContextMenuSetting && (isNxWorkspace || isAngularWorkspace);

  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );
  commands.executeCommand('setContext', 'isNxWorkspace', isNxWorkspace);
  commands.executeCommand('setContext', 'isGenerateFromContextMenuEnabled', isGenerateFromContextMenuEnabled);

  currentWorkspaceTreeProvider.setWorkspaceJsonPath(workspaceJsonPath);
  workspaceJsonTreeProvider.setWorkspaceJsonPathh(workspaceJsonPath);
}
