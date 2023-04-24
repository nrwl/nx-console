import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  ExtensionMode,
  FileSystemWatcher,
  RelativePattern,
  tasks,
  TreeItem,
  TreeView,
  Uri,
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
  initNxProjectView,
  NxProjectTreeProvider,
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
import { environment } from './environments/environment';

import { fileExists } from '@nx-console/shared/file-system';
import { enableTypeScriptPlugin } from '@nx-console/vscode/typescript-plugin';
import {
  AddDependencyCodelensProvider,
  registerVscodeAddDependency,
} from '@nx-console/vscode/add-dependency';
import { configureLspClient } from '@nx-console/vscode/lsp-client';
import {
  NxHelpAndFeedbackProvider,
  NxHelpAndFeedbackTreeItem,
} from '@nx-console/vscode/nx-help-and-feedback-view';
import { projectGraph } from '@nx-console/vscode/project-graph';
import {
  refreshWorkspace,
  REFRESH_WORKSPACE,
} from './commands/refresh-workspace';
import {
  getGenerators,
  getNxWorkspace,
  stopDaemon,
  WorkspaceCodeLensProvider,
} from '@nx-console/vscode/nx-workspace';
import { initNxCloudOnboardingView } from '@nx-console/vscode/nx-cloud-view';
import { initNxConversion } from '@nx-console/vscode/nx-conversion';

let runTargetTreeView: TreeView<RunTargetTreeItem>;
let nxHelpAndFeedbackTreeView: TreeView<NxHelpAndFeedbackTreeItem | TreeItem>;

let currentRunTargetTreeProvider: RunTargetTreeProvider;
let nxProjectsTreeProvider: NxProjectTreeProvider;

let cliTaskProvider: CliTaskProvider;
let context: ExtensionContext;
let workspaceFileWatcher: FileSystemWatcher | undefined;

let isNxWorkspace = false;

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
        revealWebViewPanel({
          runTargetTreeItem,
          context,
          cliTaskProvider,
          runTargetTreeView,
          contextMenuUri,
          generator: runTargetTreeItem.generator,
        });
      }
    );

    const manuallySelectWorkspaceDefinitionCommand = commands.registerCommand(
      LOCATE_YOUR_WORKSPACE.command?.command || '',
      async () => {
        return manuallySelectWorkspaceDefinition();
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
      refreshWorkspace(),
      projectGraph()
    );

    await enableTypeScriptPlugin(context);
    initNxCommandsView(context);

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
          return setWorkspace(selectedDirectory);
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

  WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);

  const lspContext = configureLspClient(context, REFRESH_WORKSPACE);

  // Set the NX_WORKSPACE_ROOT_PATH as soon as possible so that the nx utils can get this.
  process.env.NX_WORKSPACE_ROOT_PATH = workspacePath;

  setApplicationAndLibraryContext(workspacePath);

  isNxWorkspace = await checkIsNxWorkspace(workspacePath);
  const isAngularWorkspace = existsSync(join(workspacePath, 'angular.json'));

  if (!cliTaskProvider && !(isAngularWorkspace && !isNxWorkspace)) {
    cliTaskProvider = new CliTaskProvider();
    registerNxCommands(context);
    tasks.registerTaskProvider('nx', cliTaskProvider);
    registerCliTaskCommands(context, cliTaskProvider);

    registerVscodeAddDependency(context);

    initNxCloudOnboardingView(context, environment.production);

    nxProjectsTreeProvider = initNxProjectView(context, cliTaskProvider);

    nxHelpAndFeedbackTreeView = window.createTreeView('nxHelpAndFeedback', {
      treeDataProvider: new NxHelpAndFeedbackProvider(context),
    });

    //   registers itself as a CodeLensProvider and watches config to dispose/re-register

    new WorkspaceCodeLensProvider(context);

    new AddDependencyCodelensProvider(context);

    context.subscriptions.push(nxHelpAndFeedbackTreeView, lspContext);
  } else {
    WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);
  }

  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );
  commands.executeCommand('setContext', 'isNxWorkspace', isNxWorkspace);

  registerWorkspaceFileWatcher(context, workspacePath);

  currentRunTargetTreeProvider?.refresh();
  nxProjectsTreeProvider?.refresh();

  let workspaceType: 'nx' | 'angular' | 'angularWithNx' = 'nx';
  if (isNxWorkspace && isAngularWorkspace) {
    workspaceType = 'angularWithNx';
  } else if (isNxWorkspace && !isAngularWorkspace) {
    workspaceType = 'nx';
  } else if (!isNxWorkspace && isAngularWorkspace) {
    workspaceType = 'angular';
  }

  if (workspaceType === 'angular') {
    initNxConversion(context);
  }
}

async function setApplicationAndLibraryContext(workspacePath: string) {
  const { workspaceLayout } = await getNxWorkspace();

  if (workspaceLayout.appsDir) {
    commands.executeCommand('setContext', 'nxAppsDir', [
      join(workspacePath, workspaceLayout.appsDir),
    ]);
  }
  if (workspaceLayout.libsDir) {
    commands.executeCommand('setContext', 'nxLibsDir', [
      join(workspacePath, workspaceLayout.libsDir),
    ]);
  }

  const generatorCollections = await getGenerators();

  let hasApplicationGenerators = false;
  let hasLibraryGenerators = false;

  generatorCollections.forEach((generatorCollection) => {
    if (generatorCollection.data) {
      if (generatorCollection.data.type === 'application') {
        hasApplicationGenerators = true;
      } else if (generatorCollection.data.type === 'library') {
        hasLibraryGenerators = true;
      }
    }
  });

  commands.executeCommand(
    'setContext',
    'nx.hasApplicationGenerators',
    hasApplicationGenerators
  );
  commands.executeCommand(
    'setContext',
    'nx.hasLibraryGenerators',
    hasLibraryGenerators
  );
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
