import {
  getNxlsClient,
  NxlsClient,
  showRefreshLoadingAtLocation,
} from '@nx-console/vscode-lsp-client';
import { selectProject } from '@nx-console/vscode-nx-cli-quickpicks';
import { revealNxProject } from '@nx-console/vscode-nx-config-decoration';
import { getNxWorkspaceProjects } from '@nx-console/vscode-nx-workspace';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { ExtensionContext, commands, window } from 'vscode';
import { AtomizerDecorationProvider } from './atomizer-decorations';
import { NxProjectTreeProvider } from './nx-project-tree-provider';
import { NxTreeItem } from './nx-tree-item';
import { ProjectGraphErrorDecorationProvider } from './project-graph-error-decorations';
import {
  NxStartDaemonRequest,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server-types';
import {
  logAndShowError,
  showErrorMessageWithOpenLogs,
} from '@nx-console/vscode-output-channels';

export function initNxProjectView(
  context: ExtensionContext,
): NxProjectTreeProvider {
  const nxProjectsTreeProvider = new NxProjectTreeProvider(context);
  const nxProjectTreeView = window.createTreeView('nxProjects', {
    treeDataProvider: nxProjectsTreeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(nxProjectTreeView);
  context.subscriptions.push(
    commands.registerCommand(
      'nxConsole.showProjectConfiguration',
      showProjectConfiguration,
    ),
    commands.registerCommand('nxConsole.restartDaemonWatcher', async () => {
      await tryRestartDaemonWatcher();
    }),
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
