import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  ExtensionContext,
  ExtensionMode,
  FileSystemWatcher,
  RelativePattern,
  TreeItem,
  TreeView,
  Uri,
  commands,
  tasks,
  window,
  workspace,
} from 'vscode';

import { checkIsNxWorkspace } from '@nx-console/shared/utils';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { initNxCommandsView } from '@nx-console/vscode/nx-commands-view';
import {
  NxProjectTreeProvider,
  initNxProjectView,
} from '@nx-console/vscode/nx-project-view';
import {
  LOCATE_YOUR_WORKSPACE,
  RunTargetTreeItem,
  RunTargetTreeProvider,
} from '@nx-console/vscode/nx-run-target-view';
import {
  CliTaskProvider,
  registerCliTaskCommands,
  registerNxCommands,
} from '@nx-console/vscode/tasks';
import {
  getOutputChannel,
  getTelemetry,
  initTelemetry,
  watchFile,
} from '@nx-console/vscode/utils';
import { revealWebViewPanel } from '@nx-console/vscode/webview';

import { fileExists } from '@nx-console/shared/file-system';
import {
  AddDependencyCodelensProvider,
  registerVscodeAddDependency,
} from '@nx-console/vscode/add-dependency';
import {
  initGenerateUiWebview,
  openGenerateUi,
} from '@nx-console/vscode/generate-ui-webview';
import {
  configureLspClient,
  initRefreshWorkspace,
} from '@nx-console/vscode/lsp-client';
import { initNxConfigDecoration } from '@nx-console/vscode/nx-config-decoration';
import { initNxConversion } from '@nx-console/vscode/nx-conversion';
import {
  NxHelpAndFeedbackProvider,
  NxHelpAndFeedbackTreeItem,
} from '@nx-console/vscode/nx-help-and-feedback-view';
import { getNxWorkspace, stopDaemon } from '@nx-console/vscode/nx-workspace';
import { projectGraph } from '@nx-console/vscode/project-graph';
import { enableTypeScriptPlugin } from '@nx-console/vscode/typescript-plugin';

import { initNvmTip } from '@nx-console/vscode/nvm-tip';

let runTargetTreeView: TreeView<RunTargetTreeItem>;
let nxHelpAndFeedbackTreeView: TreeView<NxHelpAndFeedbackTreeItem | TreeItem>;

let currentRunTargetTreeProvider: RunTargetTreeProvider;
let nxProjectsTreeProvider: NxProjectTreeProvider;

let context: ExtensionContext;
let workspaceFileWatcher: FileSystemWatcher | undefined;

let isNxWorkspace = false;

let hasInitializedExtensionPoints = false;

export async function activate(c: ExtensionContext) {
  try {
    const startTime = Date.now();
    context = c;

    GlobalConfigurationStore.fromContext(context);
    WorkspaceConfigurationStore.fromContext(context);

    initTelemetry(context.extensionMode === ExtensionMode.Production);

    const revealWebViewPanelCommand = commands.registerCommand(
      'nxConsole.revealWebViewPanel',
      async (runTargetTreeItem: RunTargetTreeItem, contextMenuUri?: Uri) => {
        const newGenUi = GlobalConfigurationStore.instance.get(
          'useNewGenerateUiPreview'
        );
        if (newGenUi) {
          openGenerateUi(contextMenuUri);
        } else {
          revealWebViewPanel({
            runTargetTreeItem,
            context,
            runTargetTreeView,
            contextMenuUri,
            generator: runTargetTreeItem.generator,
          });
        }
      }
    );

    const manuallySelectWorkspaceDefinitionCommand = commands.registerCommand(
      LOCATE_YOUR_WORKSPACE.command?.command || '',
      async () => {
        manuallySelectWorkspaceDefinition();
      }
    );
    const vscodeWorkspacePath =
      workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

    if (vscodeWorkspacePath) {
      await scanForWorkspace(vscodeWorkspacePath);
    }

    context.subscriptions.push(
      runTargetTreeView,
      revealWebViewPanelCommand,
      manuallySelectWorkspaceDefinitionCommand,
      projectGraph()
    );

    await enableTypeScriptPlugin(context);
    initNxCommandsView(context);
    initNvmTip(context);
    initRefreshWorkspace(context);

    currentRunTargetTreeProvider = new RunTargetTreeProvider(context);
    runTargetTreeView = window.createTreeView('nxRunTarget', {
      treeDataProvider: currentRunTargetTreeProvider,
    }) as TreeView<RunTargetTreeItem>;

    getTelemetry().extensionActivated((Date.now() - startTime) / 1000);
  } catch (e) {
    window.showErrorMessage(
      'Nx Console encountered an error when activating (see output panel)'
    );
    getOutputChannel().appendLine(
      'Nx Console encountered an error when activating'
    );
    getOutputChannel().appendLine(e.stack);
  }
}

export async function deactivate() {
  await stopDaemon();
  getTelemetry().extensionDeactivated();
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
          setWorkspace(selectedDirectory);
        }
      });
  } else {
    window.showInformationMessage(
      'Cannot select an Nx workspace when no folders are opened in the explorer'
    );
  }
}

async function scanForWorkspace(vscodeWorkspacePath: string) {
  let currentDirectory = vscodeWorkspacePath;

  const { root } = parse(vscodeWorkspacePath);

  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  if (workspacePath) {
    currentDirectory = workspacePath;
  }

  while (currentDirectory !== root) {
    if (await fileExists(join(currentDirectory, 'angular.json'))) {
      return setWorkspace(currentDirectory);
    }
    if (await fileExists(join(currentDirectory, 'workspace.json'))) {
      return setWorkspace(currentDirectory);
    }
    if (await fileExists(join(currentDirectory, 'nx.json'))) {
      return setWorkspace(currentDirectory);
    }
    if (await fileExists(join(currentDirectory, 'lerna.json'))) {
      return setWorkspace(currentDirectory);
    }
    currentDirectory = dirname(currentDirectory);
  }
}

async function setWorkspace(workspacePath: string) {
  if (workspacePath.match(/(workspace|angular)\.json$/)) {
    workspacePath = dirname(workspacePath);
  }

  if (process.platform == 'win32') {
    workspacePath = workspacePath.replace(/\//g, '\\');
  }

  WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);

  configureLspClient(context);

  // Set the NX_WORKSPACE_ROOT_PATH as soon as possible so that the nx utils can get this.
  process.env.NX_WORKSPACE_ROOT_PATH = workspacePath;

  isNxWorkspace = await checkIsNxWorkspace(workspacePath);
  const isAngularWorkspace = existsSync(join(workspacePath, 'angular.json'));

  if (
    !(isAngularWorkspace && !isNxWorkspace) &&
    !hasInitializedExtensionPoints
  ) {
    hasInitializedExtensionPoints = true;
    registerNxCommands(context);
    tasks.registerTaskProvider('nx', CliTaskProvider.instance);
    registerCliTaskCommands(context);

    registerVscodeAddDependency(context);

    initGenerateUiWebview(context);

    nxProjectsTreeProvider = initNxProjectView(context);

    nxHelpAndFeedbackTreeView = window.createTreeView('nxHelpAndFeedback', {
      treeDataProvider: new NxHelpAndFeedbackProvider(context),
    });

    initNxConfigDecoration(context);

    new AddDependencyCodelensProvider(context);

    context.subscriptions.push(nxHelpAndFeedbackTreeView);
  } else {
    WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);
  }

  registerWorkspaceFileWatcher(context, workspacePath);

  currentRunTargetTreeProvider?.refresh();
  nxProjectsTreeProvider?.refresh();

  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );
  commands.executeCommand('setContext', 'isNxWorkspace', isNxWorkspace);

  initNxConversion(context, isAngularWorkspace, isNxWorkspace);
}

async function registerWorkspaceFileWatcher(
  context: ExtensionContext,
  workspacePath: string
) {
  if (workspaceFileWatcher) {
    workspaceFileWatcher.dispose();
  }

  const { workspaceLayout } = await getNxWorkspace();
  const workspacePackageDirs = new Set<string>();
  if (workspaceLayout.appsDir) {
    workspacePackageDirs.add(workspaceLayout.appsDir);
  }
  if (workspaceLayout.libsDir) {
    workspacePackageDirs.add(workspaceLayout.libsDir);
  }
  workspacePackageDirs.add('packages');
  context.subscriptions.push(
    watchFile(
      new RelativePattern(workspacePath, '{workspace,angular,nx,project}.json'),
      () => {
        if (!isNxWorkspace) {
          setTimeout(() => {
            setWorkspace(workspacePath);
          }, 1000);
        }
      }
    )
  );
}
