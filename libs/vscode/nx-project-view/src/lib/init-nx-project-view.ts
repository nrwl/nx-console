import { NxWorkspaceRefreshNotification } from '@nx-console/language-server-types';
import { getNxCacheDirectory } from '@nx-console/shared-nx-workspace-info';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getNxlsClient,
  showRefreshLoadingAtLocation,
} from '@nx-console/vscode-lsp-client';
import { selectProject } from '@nx-console/vscode-nx-cli-quickpicks';
import { revealNxProject } from '@nx-console/vscode-nx-config-decoration';
import { getNxWorkspaceProjects } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { existsSync } from 'fs';
import { join } from 'path';
import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import { AtomizerDecorationProvider } from './atomizer-decorations';
import { NxProjectTreeProvider } from './nx-project-tree-provider';
import { NxTreeItem } from './nx-tree-item';
import { ProjectGraphErrorDecorationProvider } from './project-graph-error-decorations';
import { ProjectsViewManager } from './projects-view-manager';

export function initNxProjectView(
  context: ExtensionContext,
): NxProjectTreeProvider {
  const nxProjectsTreeProvider = new NxProjectTreeProvider(context);
  const nxProjectTreeView = window.createTreeView('nxProjects', {
    treeDataProvider: nxProjectsTreeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(nxProjectTreeView);

  const viewManager = new ProjectsViewManager(context, nxProjectsTreeProvider);
  context.subscriptions.push(viewManager);
  context.subscriptions.push(
    commands.registerCommand(
      'nxConsole.showProjectConfiguration',
      showProjectConfiguration,
    ),
    commands.registerCommand('nxConsole.restartDaemonWatcher', async () => {
      await tryRestartDaemonWatcher();
    }),
    commands.registerCommand(
      'nxConsole.showDaemonDisabledReason',
      showDaemonDisabledReason,
    ),
  );

  AtomizerDecorationProvider.register(context);
  ProjectGraphErrorDecorationProvider.register(context);

  context.subscriptions.push(
    showRefreshLoadingAtLocation({ viewId: 'nxProjects' }),
  );

  return nxProjectsTreeProvider;
}

export async function showProjectConfiguration(selection: NxTreeItem) {
  getTelemetry().logUsage('misc.show-project-configuration');
  if (!selection) {
    const projects = await getNxWorkspaceProjects();
    const project = await selectProject(Object.keys(projects), {
      placeholderText: 'Select project to show',
    });
    if (!project) return;
    await revealNxProject(project, projects[project].data.root);
    return;
  }
  const viewItem = selection.item;
  if (
    viewItem.contextValue === 'folder' ||
    viewItem.contextValue === 'projectGraphError' ||
    viewItem.contextValue === 'daemonDisabled' ||
    viewItem.contextValue === 'daemonWatcherNotRunning'
  ) {
    return;
  }

  const { project, root } = viewItem.nxProject;
  if (
    viewItem.contextValue === 'project' ||
    viewItem.contextValue === 'targetGroup'
  ) {
    return revealNxProject(project, root);
  }
  const target = viewItem.nxTarget;
  return revealNxProject(project, root, target);
}

async function tryRestartDaemonWatcher() {
  getTelemetry().logUsage('misc.restart-daemon-watcher');

  const nxlsClient = getNxlsClient();

  await nxlsClient.sendNotification(NxWorkspaceRefreshNotification);
}

async function showDaemonDisabledReason() {
  const daemonDir = await getDaemonDirectory();

  const disabledFilePath = join(daemonDir, 'disabled');
  if (existsSync(disabledFilePath)) {
    const doc = await workspace.openTextDocument(Uri.file(disabledFilePath));
    await window.showTextDocument(doc);
    return;
  }

  const daemonLogPath = join(daemonDir, 'daemon.log');
  if (existsSync(daemonLogPath)) {
    const doc = await workspace.openTextDocument(Uri.file(daemonLogPath));
    await window.showTextDocument(doc);
    return;
  }

  showDaemonLogNotFoundError();
}

function showDaemonLogNotFoundError() {
  window
    .showErrorMessage(
      'Could not find daemon log files. Try restarting the daemon.',
      'Restart Daemon',
    )
    .then((selection) => {
      if (selection === 'Restart Daemon') {
        commands.executeCommand('nxConsole.restartDaemonWatcher');
      }
    });
}

async function getDaemonDirectory(): Promise<string> {
  const workspacePath = getNxWorkspacePath();

  try {
    const cacheDirectoryModule = await getNxCacheDirectory(
      workspacePath,
      vscodeLogger,
    );

    if (cacheDirectoryModule) {
      let workspaceDataDirectory: string;
      if (
        typeof cacheDirectoryModule.workspaceDataDirectoryForWorkspace ===
        'function'
      ) {
        workspaceDataDirectory =
          cacheDirectoryModule.workspaceDataDirectoryForWorkspace(
            workspacePath,
          );
      } else {
        workspaceDataDirectory = cacheDirectoryModule.workspaceDataDirectory;
      }

      return join(workspaceDataDirectory, 'd');
    }
  } catch {
    // Fall through to default
  }

  return join(workspacePath, '.nx', 'workspace-data', 'd');
}
