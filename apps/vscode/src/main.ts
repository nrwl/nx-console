import { existsSync } from 'fs';
import { dirname, join, parse, resolve } from 'path';
import {
  Disposable,
  ExtensionContext,
  ExtensionMode,
  RelativePattern,
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
import { CliTaskProvider, initTasks } from '@nx-console/vscode/tasks';
import { watchCodeLensConfigChange, watchFile } from '@nx-console/vscode/utils';

import { fileExists } from '@nx-console/shared/file-system';
import {
  AddDependencyCodelensProvider,
  registerVscodeAddDependency,
} from '@nx-console/vscode/add-dependency';
import { initGenerateUiWebview } from '@nx-console/vscode/generate-ui-webview';
import { createNxlsClient, getNxlsClient } from '@nx-console/vscode/lsp-client';
import { initNxConfigDecoration } from '@nx-console/vscode/nx-config-decoration';
import { initNxConversion } from '@nx-console/vscode/nx-conversion';
import { initHelpAndFeedbackView } from '@nx-console/vscode/nx-help-and-feedback-view';
import { stopDaemon } from '@nx-console/vscode/nx-workspace';
import { initVscodeProjectGraph } from '@nx-console/vscode/project-graph';
import { enableTypeScriptPlugin } from '@nx-console/vscode/typescript-plugin';

import {
  NxStopDaemonRequest,
  NxWorkspaceRefreshNotification,
  NxWorkspaceRequest,
} from '@nx-console/language-server/types';
import { initErrorDiagnostics } from '@nx-console/vscode/error-diagnostics';
import { initNvmTip } from '@nx-console/vscode/nvm-tip';
import {
  getOutputChannel,
  initOutputChannels,
} from '@nx-console/vscode/output-channels';
import { initVscodeProjectDetails } from '@nx-console/vscode/project-details';
import { initNxInit } from './nx-init';
import { registerRefreshWorkspace } from './refresh-workspace';
import { initNxCloudView } from '@nx-console/vscode/nx-cloud-view';
import { initTelemetry, getTelemetry } from '@nx-console/vscode/telemetry';

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

    initTelemetry(context.extensionMode === ExtensionMode.Production);
    initNxInit(context);

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

    await enableTypeScriptPlugin(context);
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
  await stopDaemon();
  await getNxlsClient()?.stop();
  workspaceFileWatcher?.dispose();
  getTelemetry().logUsage('extension-deactivate');
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

  WorkspaceConfigurationStore.instance.set('nxWorkspacePath', workspacePath);

  createNxlsClient(context).start(workspacePath);

  // Set the NX_WORKSPACE_ROOT_PATH as soon as possible so that the nx utils can get this.
  process.env.NX_WORKSPACE_ROOT_PATH = workspacePath;

  isNxWorkspace = await checkIsNxWorkspace(workspacePath);
  const isAngularWorkspace = existsSync(join(workspacePath, 'angular.json'));

  if (
    !(isAngularWorkspace && !isNxWorkspace) &&
    !hasInitializedExtensionPoints
  ) {
    hasInitializedExtensionPoints = true;
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
    if (!nxlsClient) {
      return;
    }

    const workspace = await nxlsClient.sendRequest(NxWorkspaceRequest, {
      reset: false,
    });

    const projects = workspace?.workspace.projects;
    if (projects && Object.keys(projects).length > 0) {
      return;
    } else {
      try {
        await Promise.race([
          nxlsClient.sendRequest(NxStopDaemonRequest, undefined),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (e) {
        // errors while stopping the daemon aren't critical
      }

      nxlsClient.sendNotification(NxWorkspaceRefreshNotification);

      await new Promise<void>((resolve) => {
        const disposable = nxlsClient.subscribeToRefresh(() => {
          disposable.dispose();
          resolve();
        });
      });
      refreshWorkspaceWithBackoff(iteration + 1);
    }
  }
}
