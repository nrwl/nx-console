import { NxWorkspace } from '@nx-console/shared/types';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getNxWorkspace,
  getProjectFolderTree,
} from '@nx-console/vscode/nx-workspace';
import {
  CliTaskProvider,
  selectRunInformationAndRun,
} from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, env, ExtensionContext } from 'vscode';
import { NxTreeItem } from './nx-tree-item';
import { TargetViewItem } from './views/nx-project-base-view';
import { ListView, ListViewItem } from './views/nx-project-list-view';
import { TreeView, TreeViewItem } from './views/nx-project-tree-view';

export type ViewItem = ListViewItem | TreeViewItem;

interface NxOptionalFlags {
  skipNxCache: boolean;
}

/**
 * Provides data for the "Projects" tree view
 */
export class NxProjectTreeProvider extends AbstractTreeProvider<NxTreeItem> {
  private readonly listView: ListView = new ListView();
  private readonly treeView: TreeView = new TreeView();

  private workspaceData: NxWorkspace | undefined = undefined;

  constructor(context: ExtensionContext) {
    super();

    (
      [
        ['revealInExplorer', this.revealInExplorer],
        ['run-task-projects-view', this.runTask],
        ['run-task-projects-view-skip-cache', this.runTaskSkipNxCache],
        ['copyTaskToClipboard', this.copyTaskToClipboard],
        ['run-task-projects-view-options', this.runTaskWithOptions],
      ] as const
    ).forEach(([commandSuffix, callback]) => {
      context.subscriptions.push(
        commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
      );
    });

    GlobalConfigurationStore.instance.onConfigurationChange(() =>
      this.refresh()
    );

    onWorkspaceRefreshed(() => this.refresh());
  }

  getParent() {
    // not implemented, because the reveal API is not needed for the projects view
    return null;
  }

  async getChildren(element?: NxTreeItem): Promise<NxTreeItem[] | undefined> {
    if (!element) {
      this.workspaceData = await getNxWorkspace();
      this.treeView.workspaceData = this.workspaceData;
      this.listView.workspaceData = this.workspaceData;
    }

    let items: (TreeViewItem | ListViewItem)[] | undefined;

    if (this.shouldUseTreeView()) {
      if (!element) {
        const projectFolderTree = await getProjectFolderTree();
        if (!projectFolderTree) {
          return;
        }
        const { treeMap, roots } = projectFolderTree;
        this.treeView.treeMap = treeMap;
        this.treeView.roots = roots;
      }
      items = await this.treeView.getChildren(element?.item as TreeViewItem);
    } else {
      items = await this.listView.getChildren(element?.item as ListViewItem);
    }
    if (!items) return;
    return items.map((item) => new NxTreeItem(item));
  }

  private shouldUseTreeView() {
    const config = GlobalConfigurationStore.instance.get('projectViewingStyle');

    if (config === 'tree') {
      return true;
    }
    if (config === 'list') {
      return false;
    }
    if (!this.workspaceData) {
      return true;
    }
    return Object.keys(this.workspaceData.workspace.projects).length > 10;
  }

  private async runTask(
    selection: NxTreeItem,
    optionalFlags?: NxOptionalFlags
  ) {
    getTelemetry().logUsage('tasks.run', {
      source: 'projects-view',
    });
    const viewItem = selection.item;
    if (
      viewItem.contextValue === 'project' ||
      viewItem.contextValue === 'folder' ||
      viewItem.contextValue === 'targetGroup'
    ) {
      // can not run a task on a project, folder or target group
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

    CliTaskProvider.instance.executeTask({
      command: 'run',
      positional: `${project}:${target.name}`,
      flags,
    });
  }

  private async runTaskSkipNxCache(selection: NxTreeItem) {
    this.runTask(selection, { skipNxCache: true });
  }
  private async runTaskWithOptions(selection: NxTreeItem) {
    getTelemetry().logUsage('tasks.run', {
      source: 'projects-view',
    });
    const item = selection.item as TargetViewItem;
    const project = item.nxProject.project;
    const target = item.nxTarget.name;
    const configuration = item.nxTarget.configuration;
    selectRunInformationAndRun(project, target, configuration, true);
  }

  private async copyTaskToClipboard(selection: NxTreeItem) {
    getTelemetry().logUsage('tasks.copy-to-clipboard');
    env.clipboard.writeText(`nx run ${selection.id}`);
  }

  private async revealInExplorer(selection: NxTreeItem) {
    if (selection.resourceUri) {
      getTelemetry().logUsage('misc.show-project-configuration');
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }
}
