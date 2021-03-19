import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  tasks,
  TreeView,
  Uri,
  window,
  workspace,
} from 'vscode';

import {
  CliTaskProvider,
  registerCliTaskCommands,
  registerNxCommands,
} from '@nx-console/vscode/tasks';
import {
  getOutputChannel,
  getTelemetry,
  initTelemetry,
  teardownTelemetry,
} from '@nx-console/server';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { revealWebViewPanel } from '@nx-console/vscode/webview';
import {
  LOCATE_YOUR_WORKSPACE,
  WorkspaceTreeItem,
  WorkspaceTreeProvider,
} from '@nx-console/vscode/nx-workspace-tree';
import { verifyNodeModules, verifyWorkspace } from '@nx-console/vscode/verify';
import {
  NxCommandsTreeItem,
  NxCommandsTreeProvider,
} from '@nx-console/vscode/nx-commands-tree';
import {
  NxProjectTreeItem,
  NxProjectTreeProvider,
} from '@nx-console/vscode/nx-project-tree';
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

    GlobalConfigurationStore.fromContext(context);
    WorkspaceConfigurationStore.fromContext(context);

    currentWorkspaceTreeProvider = new WorkspaceTreeProvider(
      context.extensionPath
    );

    initTelemetry(GlobalConfigurationStore.instance, environment.production);

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
          return manuallySelectWorkspaceDefinition();
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
  WorkspaceConfigurationStore.instance.set(
    'nxWorkspaceJsonPath',
    workspaceJsonPath
  );

  const { validWorkspaceJson } = verifyWorkspace();
  if (!validWorkspaceJson) {
    return;
  }

  if (!cliTaskProvider) {
    cliTaskProvider = new CliTaskProvider();
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
    WorkspaceConfigurationStore.instance.set(
      'nxWorkspaceJsonPath',
      workspaceJsonPath
    );
  }

  const isNxWorkspace = existsSync(join(workspaceJsonPath, '..', 'nx.json'));
  const isAngularWorkspace = workspaceJsonPath.endsWith('angular.json');
  const enableGenerateFromContextMenuSetting = GlobalConfigurationStore.instance.get(
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

  currentWorkspaceTreeProvider.refresh();
  nxProjectsTreeProvider.refresh();
}
