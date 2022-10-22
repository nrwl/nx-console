import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { revealNxProject } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, ExtensionContext } from 'vscode';
import {
  ListViewStrategy,
  TreeViewStrategy,
} from './views/nx-project-base-view';
import {
  NxFolderTreeItem,
  NxListViewItem,
  NxProjectTreeItem,
  NxTreeItem,
} from './nx-project-tree-item';
import { createTreeViewStrategy } from './views/nx-project-tree-view';
import { createListViewStrategy } from './views/nx-project-list-view';

/**
 * Provides data for the "Projects" tree view
 */
export class NxProjectTreeProvider extends AbstractTreeProvider<NxTreeItem> {
  private readonly listView: ListViewStrategy;
  private readonly treeView: TreeViewStrategy;

  constructor(
    context: ExtensionContext,
    private readonly cliTaskProvider: CliTaskProvider
  ) {
    super();

    (
      [
        ['editWorkspaceJson', this.editWorkspaceJson],
        ['revealInExplorer', this.revealInExplorer],
        ['runTask', this.runTask],
        ['refreshNxProjectsTree', this.refreshNxProjectsTree],
      ] as const
    ).forEach(([commandSuffix, callback]) => {
      context.subscriptions.push(
        commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
      );
    });

    this.listView = createListViewStrategy(this.cliTaskProvider);
    this.treeView = createTreeViewStrategy(this.cliTaskProvider);
  }

  getParent(element: NxTreeItem) {
    if (this.isListViewElement(element)) {
      return this.listView.getParent(element);
    }
    return this.treeView.getParent(element);
  }

  getChildren(element?: NxTreeItem) {
    if (this.isListViewElement(element)) {
      return this.listView.getChildren(element);
    }
    return this.treeView.getChildren(element);
  }

  private isListViewElement(_?: NxTreeItem): _ is NxListViewItem {
    return !GlobalConfigurationStore.instance.get('enableProjectTreeView');
  }

  private async runTask(selection: NxTreeItem) {
    if (
      selection instanceof NxProjectTreeItem ||
      selection instanceof NxFolderTreeItem
    ) {
      // can not run a task on a project
      return;
    }
    const { project } = selection.nxProject;
    const target = selection.nxTarget;

    const flags = [];
    if (target.configuration) {
      flags.push(`--configuration=${target.configuration}`);
    }

    this.cliTaskProvider.executeTask({
      command: target.name,
      positional: project,
      flags,
    });
  }

  private async revealInExplorer(selection: NxTreeItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editWorkspaceJson(selection: NxTreeItem) {
    if (selection instanceof NxFolderTreeItem) {
      return;
    }

    const { project, root } = selection.nxProject;
    if (selection instanceof NxProjectTreeItem) {
      return revealNxProject(project, root);
    }
    const target = selection.nxTarget;
    return revealNxProject(project, root, target);
  }

  private async refreshNxProjectsTree() {
    this.refresh();
  }
}
