import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { AbstractTreeProvider, getTelemetry } from '@nx-console/vscode/utils';
import { commands, env, ExtensionContext, ProviderResult } from 'vscode';
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
import { revealNxProject } from '@nx-console/vscode/nx-config-decoration';
import { TargetViewItem } from './views/nx-project-base-view';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';

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

  constructor(context: ExtensionContext) {
    super();

    (
      [
        ['revealInExplorer', this.revealInExplorer],
        ['runTask', this.runTask],
        ['runTaskSkipNxCache', this.runTaskSkipNxCache],
        ['copyTaskToClipboard', this.copyTaskToClipboard],
        ['runTaskWithOptions', this.runTaskWithOptions],
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

    onWorkspaceRefreshed(() => this.refresh());
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
    getTelemetry().featureUsed('runTask');
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

    let problemMatchers : string | string[] | undefined;
    switch (target.name) {
      case 'lint':
        problemMatchers = ['$eslint-stylish'];
        break;      
    }

    CliTaskProvider.instance.executeTask({
      command: 'run',
      positional: `${project}:${target.name}`,
      flags,
      problemMatchers
    });
  }

  private async runTaskSkipNxCache(selection: NxTreeItem) {
    getTelemetry().featureUsed('runTask');
    this.runTask(selection, { skipNxCache: true });
  }
  private async runTaskWithOptions(selection: NxTreeItem) {
    getTelemetry().featureUsed('runTask');
    const item = selection.item as TargetViewItem;
    const project = item.nxProject.project;
    const target = item.nxTarget.name;
    const configuration = item.nxTarget.configuration;
    commands.executeCommand('nx.run', project, target, configuration, true);
  }

  private async copyTaskToClipboard(selection: NxTreeItem) {
    getTelemetry().featureUsed('copyTaskToClipboard');
    env.clipboard.writeText(`nx run ${selection.id}`);
  }

  private async revealInExplorer(selection: NxTreeItem) {
    if (selection.resourceUri) {
      getTelemetry().featureUsed('revealInExplorer');
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }
}
