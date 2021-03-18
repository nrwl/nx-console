import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  tasks,
  TreeView,
  window,
  workspace,
  Uri,
} from 'vscode';

import { registerCliTaskCommands } from './app/cli-task/cli-task-commands';
import { CliTaskProvider } from './app/cli-task/cli-task-provider';
import {
  getOutputChannel,
  getTelemetry,
  initTelemetry,
  teardownTelemetry,
} from '@nx-console/server';
import { NxConsoleConfigurationStore } from '@nx-console/vscode/configuration';
import { revealWebViewPanel } from './app/webview';
import { WorkspaceTreeItem } from './app/workspace-tree/workspace-tree-item';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeProvider,
} from './app/workspace-tree/workspace-tree-provider';
import {
  verifyNodeModules,
  verifyWorkspace,
} from '@nx-console/vscode/verify-workspace';
import { registerNxCommands } from './app/nx-task/nx-task-commands';
import { NxCommandsTreeItem } from './app/nx-commands-tree/nx-commands-tree-item';
import {
  NxProjectTreeProvider,
  NxProjectTreeItem,
} from '@nx-console/vscode/nx-project-tree';
import { NxCommandsTreeProvider } from './app/nx-commands-tree/nx-commands-provider';
import { environment } from './environments/environment';

let workspaceTreeView: TreeView<WorkspaceTreeItem>;
let nxProjectTreeView: TreeView<NxProjectTreeItem>;
let nxCommandsTreeView: TreeView<NxCommandsTreeItem>;

let currentWorkspaceTreeProvider: WorkspaceTreeProvider;
let nxProjectsTreeProvider: NxProjectTreeProvider;

let cliTaskProvider: CliTaskProvider;
let context: ExtensionContext;

export function activate(c: ExtensionContext) {
  try {
    const startTime = Date.now();
    context = c;

    NxConsoleConfigurationStore.fromContext(context);

    currentWorkspaceTreeProvider = new WorkspaceTreeProvider(
      undefined,
      context.extensionPath
    );

    initTelemetry(NxConsoleConfigurationStore.instance, environment.production);

    workspaceTreeView = window.createTreeView('nxConsole', {
      treeDataProvider: currentWorkspaceTreeProvider,
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
        openLabel: 'Select workspace directory',
      })
      .then((value) => {
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

    nxProjectsTreeProvider = new NxProjectTreeProvider(
      context,
      cliTaskProvider
    );

    nxProjectTreeView = window.createTreeView('nxProjects', {
      treeDataProvider: nxProjectsTreeProvider,
    });
    context.subscriptions.push(nxProjectTreeView);

    const nxCommandsTreeProvider = new NxCommandsTreeProvider(context);

    nxCommandsTreeView = window.createTreeView('nxCommands', {
      treeDataProvider: nxCommandsTreeProvider,
    });
    context.subscriptions.push(nxCommandsTreeView);
  } else {
    cliTaskProvider.setWorkspaceJsonPath(workspaceJsonPath);
  }

  const isNxWorkspace = existsSync(join(workspaceJsonPath, '..', 'nx.json'));
  const isAngularWorkspace = workspaceJsonPath.endsWith('angular.json');
  const store = NxConsoleConfigurationStore.instance;
  const enableGenerateFromContextMenuSetting = store.get(
    'enableGenerateFromContextMenu'
  );
  const isGenerateFromContextMenuEnabled =
    enableGenerateFromContextMenuSetting &&
    (isNxWorkspace || isAngularWorkspace);

  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );
  commands.executeCommand('setContext', 'isNxWorkspace', isNxWorkspace);
  commands.executeCommand(
    'setContext',
    'isGenerateFromContextMenuEnabled',
    isGenerateFromContextMenuEnabled
  );

  currentWorkspaceTreeProvider.setWorkspaceJsonPath(workspaceJsonPath);
  nxProjectsTreeProvider.setWorkspaceJsonPath(workspaceJsonPath);
}
