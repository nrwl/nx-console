import { NxTreeItem } from "@nx-console/vscode/nx-project-view";

export async function showProjectConfiguration(selection: NxTreeItem) {
    getTelemetry().featureUsed('editWorkspaceJson');
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