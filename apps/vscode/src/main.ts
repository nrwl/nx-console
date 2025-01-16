import { existsSync } from 'fs';
import { dirname, join, parse, relative, resolve } from 'path';
import {
  Disposable,
  ExtensionContext,
  ProgressLocation,
  RelativePattern,
  commands,
  tasks,
  window,
  workspace,
} from 'vscode';

import {
  checkIsNxWorkspace,
  killGroup,
  withTimeout,
} from '@nx-console/shared-utils';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { initNxCommandsView } from '@nx-console/vscode-nx-commands-view';
import {
  NxProjectTreeProvider,
  initNxProjectView,
} from '@nx-console/vscode-nx-project-view';
import { CliTaskProvider, initTasks } from '@nx-console/vscode-tasks';
import { watchCodeLensConfigChange, watchFile } from '@nx-console/vscode-utils';

import { fileExists } from '@nx-console/shared-file-system';
import {
  AddDependencyCodelensProvider,
  registerVscodeAddDependency,
} from '@nx-console/vscode-add-dependency';
import { initGenerateUiWebview } from '@nx-console/vscode-generate-ui-webview';
import {
  createNxlsClient,
  getNxlsClient,
  showRefreshLoadingAtLocation,
} from '@nx-console/vscode-lsp-client';
import { initNxConfigDecoration } from '@nx-console/vscode-nx-config-decoration';
import { initNxConversion } from '@nx-console/vscode-nx-conversion';
import { initHelpAndFeedbackView } from '@nx-console/vscode-nx-help-and-feedback-view';
import { initVscodeProjectGraph } from '@nx-console/vscode-project-graph';
import { initTypeScriptServerPlugin } from '@nx-console/vscode-typescript-plugin';

import {
  NxWorkspaceRefreshNotification,
  NxWorkspaceRequest,
} from '@nx-console/language-server-types';
import { initErrorDiagnostics } from '@nx-console/vscode-error-diagnostics';
import { initNvmTip } from '@nx-console/vscode-nvm-tip';
import { initNxCloudView } from '@nx-console/vscode-nx-cloud-view';
import {
  getOutputChannel,
  initOutputChannels,
} from '@nx-console/vscode-output-channels';
import { initVscodeProjectDetails } from '@nx-console/vscode-project-details';
import { getTelemetry, initTelemetry } from '@nx-console/vscode-telemetry';
import { RequestType } from 'vscode-languageserver';
import { initNxInit } from './nx-init';
import { registerRefreshWorkspace } from './refresh-workspace';

let nxProjectsTreeProvider: NxProjectTreeProvider;

let context: ExtensionContext;
let workspaceFileWatcher: Disposable | undefined;

let isNxWorkspace = false;

let hasInitializedExtensionPoints = false;

export async function activate(c: ExtensionContext) {
  try {
    const startTime = Date.now();
    context = c;

    GlobalConfigurationStore.fromContext(context);
    WorkspaceConfigurationStore.fromContext(context);

    createNxlsClient(context);

    initTelemetry(context);
    initNxInit(context);

    context.subscriptions.push(
      showRefreshLoadingAtLocation(ProgressLocation.Window)
    );

    initHelpAndFeedbackView(context);
    const manuallySelectWorkspaceDefinitionCommand = commands.registerCommand(
      'nxConsole.selectWorkspaceManually',
      async () => {
        manuallySelectWorkspaceDefinition();
      }
    );
    const vscodeWorkspacePath =
      workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

    if (vscodeWorkspacePath) {
      await scanForWorkspace(vscodeWorkspacePath);

      if (!isNxWorkspace && !workspaceFileWatcher) {
        registerWorkspaceFileWatcher(context, vscodeWorkspacePath);
      }
    }

    context.subscriptions.push(manuallySelectWorkspaceDefinitionCommand);
    await registerSettingsNxWorkspacePathWatcher();

    await initTypeScriptServerPlugin(context);
    watchCodeLensConfigChange(context);

    getTelemetry().logUsage('extension-activate', {
      timing: (Date.now() - startTime) / 1000,
    });
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
  try {
    await withTimeout(
      async () =>
        await getNxlsClient()?.sendRequest(
          new RequestType('shutdown'),
          undefined
        ),
      2000
    );
  } catch (e) {
    // do nothing, we have to deactivate before the process is killed
  }

  workspaceFileWatcher?.dispose();

  const nxlsPid = getNxlsClient()?.getNxlsPid();
  if (nxlsPid) {
    killGroup(nxlsPid);
  }

  getTelemetry().logUsage('extension-deactivate');

  killGroup(process.pid);
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
          const workspaceRoot =
            workspace.workspaceFolders?.[0].uri.fsPath || '';
          const selectedDirectoryRelativePath = relative(
            workspaceRoot,
            selectedDirectory
          );
          GlobalConfigurationStore.instance.set(
            'nxWorkspacePath',
            selectedDirectoryRelativePath
          );
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

  const workspacePathFromSettings =
    GlobalConfigurationStore.instance.config.get<string>('nxWorkspacePath');
  if (workspacePathFromSettings) {
    currentDirectory = resolve(
      workspace.workspaceFolders?.[0].uri.fsPath || '',
      workspacePathFromSettings
    );
  } else {
    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );
    if (workspacePath) {
      currentDirectory = workspacePath;
    }
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

  getNxlsClient().setWorkspacePath(workspacePath);

  WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);

  // TODO(maxkless): I don't think this is necessary anymore, remove?
  // Set the NX_WORKSPACE_ROOT_PATH as soon as possible so that the nx utils can get this.
  process.env.NX_WORKSPACE_ROOT_PATH = workspacePath;

  isNxWorkspace = await checkIsNxWorkspace(workspacePath);
  const isAngularWorkspace = existsSync(join(workspacePath, 'angular.json'));

  if (
    !(isAngularWorkspace && !isNxWorkspace) &&
    !hasInitializedExtensionPoints
  ) {
    hasInitializedExtensionPoints = true;
    getNxlsClient().start(workspacePath);

    tasks.registerTaskProvider('nx', CliTaskProvider.instance);
    initTasks(context);
    registerVscodeAddDependency(context);

    registerRefreshWorkspace(context);

    initGenerateUiWebview(context);

    initNxCommandsView(context);
    initNxCloudView(context);
    initNvmTip(context);
    initVscodeProjectDetails(context);
    initVscodeProjectGraph(context);
    initErrorDiagnostics(context);
    initOutputChannels(context);

    nxProjectsTreeProvider = initNxProjectView(context);

    initNxConfigDecoration(context);

    new AddDependencyCodelensProvider();
  } else {
    WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);
  }

  registerWorkspaceFileWatcher(context, workspacePath);

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

  workspaceFileWatcher = watchFile(
    new RelativePattern(workspacePath, '{workspace,angular,nx,project}.json'),
    async () => {
      if (!isNxWorkspace) {
        await setWorkspace(workspacePath);
        if (isNxWorkspace) {
          getOutputChannel().appendLine(
            'Detected Nx workspace. Refreshing workspace.'
          );
          refreshWorkspaceWithBackoff();
        }
      }
    }
  );

  context.subscriptions.push(workspaceFileWatcher);

  // when initializing Nx, there can be timing issues as the nxls starts up
  // we make sure to refresh the workspace periodically as we start up so that we have the latest info
  async function refreshWorkspaceWithBackoff(iteration = 1) {
    if (iteration > 3) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * iteration));

    const nxlsClient = getNxlsClient();

    const workspace = await nxlsClient.sendRequest(NxWorkspaceRequest, {
      reset: false,
    });

    const projects = workspace?.projectGraph.nodes;
    if (projects && Object.keys(projects).length > 0) {
      return;
    } else {
      await nxlsClient.sendNotification(NxWorkspaceRefreshNotification);

      await new Promise<void>((resolve) => {
        const disposable = nxlsClient.onNotification(
          NxWorkspaceRefreshNotification,
          () => {
            disposable.dispose();
            resolve();
          }
        );
      });
      refreshWorkspaceWithBackoff(iteration + 1);
    }
  }
}

async function registerSettingsNxWorkspacePathWatcher() {
  const settingsNxWorkspacePathWatcher = workspace.onDidChangeConfiguration(
    async (event) => {
      if (event.affectsConfiguration('nxConsole.nxWorkspacePath')) {
        const newWorkspacePath =
          GlobalConfigurationStore.instance.config.get<string>(
            'nxWorkspacePath'
          );
        if (newWorkspacePath) {
          const nxWorkspacePath = resolve(
            workspace.workspaceFolders?.[0].uri.fsPath || '',
            newWorkspacePath
          );
          await setWorkspace(nxWorkspacePath);
        }
      }
    }
  );

  context.subscriptions.push(settingsNxWorkspacePathWatcher);
}
