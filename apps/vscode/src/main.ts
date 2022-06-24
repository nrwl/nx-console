import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
import {
  commands,
  ExtensionContext,
  FileSystemWatcher,
  RelativePattern,
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
  getGenerators,
  teardownTelemetry,
  watchFile,
  fileExists,
  checkIsNxWorkspace,
} from '@nx-console/server';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { revealWebViewPanel } from '@nx-console/vscode/webview';
import {
  LOCATE_YOUR_WORKSPACE,
  RunTargetTreeItem,
  RunTargetTreeProvider,
} from '@nx-console/vscode/nx-run-target-view';
import {
  NxCommandsTreeItem,
  NxCommandsTreeProvider,
} from '@nx-console/vscode/nx-commands-view';
import {
  NxProjectTreeItem,
  NxProjectTreeProvider,
} from '@nx-console/vscode/nx-project-view';
import { environment } from './environments/environment';
import { AsyncReturnType } from 'type-fest';

import {
  WorkspaceJsonSchema,
  ProjectJsonSchema,
} from '@nx-console/vscode/json-schema';
import { enableTypeScriptPlugin } from '@nx-console/typescript-plugin';
import { NxConversion } from '@nx-console/vscode/nx-conversion';
import { refreshWorkspace } from './commands/refresh-workspace';

let runTargetTreeView: TreeView<RunTargetTreeItem>;
let nxProjectTreeView: TreeView<NxProjectTreeItem>;
let nxCommandsTreeView: TreeView<NxCommandsTreeItem>;

let currentRunTargetTreeProvider: RunTargetTreeProvider;
let nxProjectsTreeProvider: NxProjectTreeProvider;

let cliTaskProvider: CliTaskProvider;
let context: ExtensionContext;
let workspaceFileWatcher: FileSystemWatcher | undefined;

export async function activate(c: ExtensionContext) {
  try {
    const startTime = Date.now();
    context = c;

    GlobalConfigurationStore.fromContext(context);
    WorkspaceConfigurationStore.fromContext(context);

    currentRunTargetTreeProvider = new RunTargetTreeProvider(context);

    initTelemetry(GlobalConfigurationStore.instance, environment.production);

    runTargetTreeView = window.createTreeView('nxRunTarget', {
      treeDataProvider: currentRunTargetTreeProvider,
    }) as TreeView<RunTargetTreeItem>;

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
      refreshWorkspace()
    );

    //   registers itself as a CodeLensProvider and watches config to dispose/re-register

    const { WorkspaceCodeLensProvider } = await import(
      '@nx-console/vscode/nx-workspace'
    );
    new WorkspaceCodeLensProvider(context);
    new WorkspaceJsonSchema(context);
    new ProjectJsonSchema(context);

    NxConversion.createInstance(context);

    await enableTypeScriptPlugin(context);

    getTelemetry().extensionActivated((Date.now() - startTime) / 1000);
  } catch (e) {
    window.showErrorMessage(
      'Nx Console encountered an error when activating (see output panel)'
    );
    getOutputChannel().appendLine(
      'Nx Console encountered an error when activating'
    );
    getOutputChannel().appendLine(e.stack);
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

  // Set the NX_WORKSPACE_ROOT_PATH as soon as possible so that the nx utils can get this.
  process.env.NX_WORKSPACE_ROOT_PATH = workspacePath;

  // const { verifyWorkspace } = await import('@nx-console/vscode/nx-workspace');

  // const { validWorkspaceJson } = await verifyWorkspace();
  // if (!validWorkspaceJson) {
  //   return;
  // // }

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

    const nxCommandsTreeProvider = new NxCommandsTreeProvider(context);
    nxCommandsTreeView = window.createTreeView('nxCommands', {
      treeDataProvider: nxCommandsTreeProvider,
    });

    context.subscriptions.push(nxCommandsTreeView, nxProjectTreeView);
  } else {
    WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);
  }

  setApplicationAndLibraryContext(workspacePath);

  const isNxWorkspace = await checkIsNxWorkspace(workspacePath);
  const isAngularWorkspace = existsSync(join(workspacePath, 'angular.json'));

  commands.executeCommand(
    'setContext',
    'isAngularWorkspace',
    isAngularWorkspace
  );
  commands.executeCommand('setContext', 'isNxWorkspace', isNxWorkspace);

  registerWorkspaceFileWatcher(context, workspacePath);

  currentRunTargetTreeProvider.refresh();
  nxProjectsTreeProvider.refresh();

  let workspaceType: 'nx' | 'angular' | 'angularWithNx' = 'nx';
  if (isNxWorkspace && isAngularWorkspace) {
    workspaceType = 'angularWithNx';
  } else if (isNxWorkspace && !isAngularWorkspace) {
    workspaceType = 'nx';
  } else if (!isNxWorkspace && isAngularWorkspace) {
    workspaceType = 'angular';
  }

  const { nxVersion } = await import('@nx-console/vscode/nx-workspace');

  WorkspaceConfigurationStore.instance.set('workspaceType', workspaceType);
  WorkspaceConfigurationStore.instance.set('nxVersion', await nxVersion());

  getTelemetry().record('WorkspaceType', { workspaceType });
}

async function setApplicationAndLibraryContext(workspacePath: string) {
  const { getNxConfig } = await import('@nx-console/vscode/nx-workspace');

  let nxConfig: AsyncReturnType<typeof getNxConfig>;
  try {
    nxConfig = await getNxConfig(workspacePath);
  } catch {
    return;
  }

  commands.executeCommand('setContext', 'nxAppsDir', [
    join(workspacePath, nxConfig.workspaceLayout?.appsDir ?? 'apps'),
  ]);
  commands.executeCommand('setContext', 'nxLibsDir', [
    join(workspacePath, nxConfig.workspaceLayout?.libsDir ?? 'libs'),
  ]);

  const generatorCollections = await getGenerators(workspacePath);

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

function registerWorkspaceFileWatcher(
  context: ExtensionContext,
  workspaceJsonPath: string
) {
  if (workspaceFileWatcher) {
    workspaceFileWatcher.dispose();
  }

  const workspaceDir = dirname(workspaceJsonPath);

  workspaceFileWatcher = watchFile(
    new RelativePattern(
      workspaceDir,
      '**/{workspace,angular,project,nx,package}.json'
    ),
    () => {
      commands.executeCommand('nxConsole.refreshWorkspace');
    }
  );

  context.subscriptions.push(workspaceFileWatcher);
}
