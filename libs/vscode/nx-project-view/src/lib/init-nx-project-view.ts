import { ExtensionContext, commands, window } from 'vscode';
import { NxProjectTreeProvider } from './nx-project-tree-provider';
import { listenForAndStoreCollapsibleChanges } from './tree-item-collapsible-store';
import { NxTreeItem } from './nx-tree-item';
import { getTelemetry } from '@nx-console/vscode/utils';
import { revealNxProject } from '@nx-console/vscode/nx-config-decoration';
import { selectProject } from '@nx-console/vscode/nx-cli-quickpicks';
import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';

export function initNxProjectView(
  context: ExtensionContext
): NxProjectTreeProvider {
  const nxProjectsTreeProvider = new NxProjectTreeProvider(context);
  const nxProjectTreeView = window.createTreeView('nxProjects', {
    treeDataProvider: nxProjectsTreeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(nxProjectTreeView);

  listenForAndStoreCollapsibleChanges(nxProjectTreeView, context);

  commands.registerCommand(
    'nxConsole.showProjectConfiguration',
    showProjectConfiguration
  );

  return nxProjectsTreeProvider;
}

export async function showProjectConfiguration(selection: NxTreeItem) {
  getTelemetry().featureUsed('editWorkspaceJson');
  if (!selection) {
    const projects = await getNxWorkspaceProjects();
    const project = await selectProject(Object.keys(projects));
    if (!project) return;
    await revealNxProject(project, projects[project].root);
    return;
  }
  const viewItem = selection.item;
  if (viewItem.contextValue === 'folder') {
    return;
  }

  const { project, root } = viewItem.nxProject;
  if (viewItem.contextValue === 'project') {
    return revealNxProject(project, root);
  }
  const target = viewItem.nxTarget;
  return revealNxProject(project, root, target);
}
