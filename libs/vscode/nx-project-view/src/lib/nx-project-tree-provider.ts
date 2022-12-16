import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { revealNxProject } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, ExtensionContext, ProviderResult } from 'vscode';
import { NxTreeItem } from './nx-tree-item';
import {
  AutomaticViewItem,
  AutomaticViewStrategy,
  createAutomaticViewStrategy,
} from './views/nx-project-automatic-view';
import {
  ListViewItem,
  ListViewStrategy,
  createListViewStrategy,
} from './views/nx-project-list-view';
import {
  createTreeViewStrategy,
  TreeViewItem,
  TreeViewStrategy,
} from './views/nx-project-tree-view';

export type ViewItem = ListViewItem | TreeViewItem | AutomaticViewItem;

interface NxOptionalFlags {
  skipNxCache: boolean;
}

/**
 * Provides data for the "Projects" tree view
 */
export class NxProjectTreeProvider extends AbstractTreeProvider<NxTreeItem> {
  private readonly listView: ListViewStrategy;
  private readonly treeView: TreeViewStrategy;
  private readonly automaticView: AutomaticViewStrategy;

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
        ['runTaskSkipNxCache', this.runTaskSkipNxCache],
      ] as const
    ).forEach(([commandSuffix, callback]) => {
      context.subscriptions.push(
        commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
      );
    });

    this.listView = createListViewStrategy();
    this.treeView = createTreeViewStrategy();
    this.automaticView = createAutomaticViewStrategy();

    GlobalConfigurationStore.instance.onConfigurationChange(() =>
      this.refresh()
    );
  }

  getParent() {
    // not implemented, because the reveal API is not needed for the projects view
    return null;
  }

  getChildren(element?: NxTreeItem): ProviderResult<NxTreeItem[]> {
    return this.getViewChildren(element?.item).then((items) => {
      if (!items) return [];
      return items.map((item) => new NxTreeItem(item));
    });
  }

  private async getViewChildren(viewItem?: ViewItem) {
    if (this.isListViewElement(viewItem)) {
      return this.listView.getChildren(viewItem);
    }
    if (this.isTreeViewElement(viewItem)) {
      return this.treeView.getChildren(viewItem);
    }
    return this.automaticView.getChildren(viewItem);
  }

  private isListViewElement(_?: ViewItem): _ is ListViewItem {
    const config = GlobalConfigurationStore.instance.get('projectViewingStyle');
    return config === 'list' || config === null;
  }

  private isTreeViewElement(_?: ViewItem): _ is TreeViewItem {
    const config = GlobalConfigurationStore.instance.get('projectViewingStyle');
    return config === 'tree';
  }

  private async runTask(
    selection: NxTreeItem,
    optionalFlags?: NxOptionalFlags
  ) {
    const viewItem = selection.item;
    if (
      viewItem.contextValue === 'project' ||
      viewItem.contextValue === 'folder'
    ) {
      // can not run a task on a project
      return;
    }
    const { project } = viewItem.nxProject;
    const target = viewItem.nxTarget;

    const flags = [];
    if (target.configuration) {
      flags.push(`--configuration=${target.configuration}`);
    }

    if (optionalFlags?.skipNxCache) {
      flags.push('--skip-nx-cache');
    }

    this.cliTaskProvider.executeTask({
      command: target.name,
      positional: project,
      flags,
    });
  }

  private async runTaskSkipNxCache(selection: NxTreeItem) {
    this.runTask(selection, { skipNxCache: true });
  }

  private async revealInExplorer(selection: NxTreeItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editWorkspaceJson(selection: NxTreeItem) {
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

  private async refreshNxProjectsTree() {
    this.refresh();
  }
}
