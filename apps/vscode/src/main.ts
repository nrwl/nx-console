import { EXTENSIONS } from '@nx-console/server';
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

import { WorkspaceJsonTreeItem } from './app/workspace-json-tree/workspace-json-tree-item';
import { WorkspaceJsonTreeProvider } from './app/workspace-json-tree/workspace-json-tree-provider';
import { AffectedTreeItem } from './app/affected-tree/affected-tree-item';
import { AffectedTreeProvider } from './app/affected-tree/affected-tree-provider';
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
let affectedTreeView: TreeView<AffectedTreeItem>;

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
        async (workspaceTreeItem: WorkspaceTreeItem) => {
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

                cliTaskProvider.executeTask({
                  command: 'add',
                  positional: selection.label,
                  flags: []
                });
              });
          }

          revealWebViewPanel({
            workspaceTreeItem,
            context,
            cliTaskProvider,
            workspaceTreeView
          });
        }
      )
    );
    context.subscriptions.push(
      commands.registerCommand(
        LOCATE_YOUR_WORKSPACE.command!.command,
        async () => {
          return await locationWorkspaceDefinition();
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

function locationWorkspaceDefinition() {
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

  const childWorkspaceJsonStream = stream('**/{angular,workspace}.json', {
    cwd: vscodeWorkspacePath,
    deep: 3,
    onlyFiles: true,
    absolute: true,
    stats: false
  })
    .on('data', (workspaceJsonPath: string) => {
      childWorkspaceJsonStream.pause();

      setWorkspace(workspaceJsonPath);
    })
    .on('end', () => {
      currentWorkspaceTreeProvider.endScan();
    });
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

    workspaceJsonTreeView = window.createTreeView('workspaceJson', {
      treeDataProvider: workspaceJsonTreeProvider
    }) as TreeView<WorkspaceJsonTreeItem>;
    context.subscriptions.push(workspaceJsonTreeView);

    const affectedTreeProvider = AffectedTreeProvider.create(context);

    affectedTreeView = window.createTreeView('nxAffected', {
      treeDataProvider: affectedTreeProvider
    }) as TreeView<AffectedTreeItem>;
    context.subscriptions.push(affectedTreeView);
  } else {
    cliTaskProvider.setWorkspaceJsonPath(workspaceJsonPath);
  }

  const isNxWorkspace = existsSync(join(workspaceJsonPath, '..', 'nx.json'));
  const isAngularWorkspace = workspaceJsonPath.endsWith('angular.json');
  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );
  commands.executeCommand('setContext', 'isNxWorkspace', isNxWorkspace);

  currentWorkspaceTreeProvider.setWorkspaceJsonPath(workspaceJsonPath);
  workspaceJsonTreeProvider.setWorkspaceJsonPathh(workspaceJsonPath);
}
