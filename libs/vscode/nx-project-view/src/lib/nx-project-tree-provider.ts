import { revealNxProject } from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, ExtensionContext } from 'vscode';
import { ListViewStrategy } from './nx-project-helper';
import { createListViewStrategy } from './nx-project-list-view';
import { NxProjectTreeItem, NxListViewItem } from './nx-project-tree-item';

/**
 * Provides data for the "Projects" tree view
 */
export class NxProjectTreeProvider extends AbstractTreeProvider<NxListViewItem> {
  private readonly listView: ListViewStrategy;

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
      ] as [string, (item: NxListViewItem) => Promise<unknown>][]
    ).forEach(([commandSuffix, callback]) => {
      context.subscriptions.push(
        commands.registerCommand(`nxConsole.${commandSuffix}`, callback, this)
      );
    });

    this.listView = createListViewStrategy(this.cliTaskProvider);
  }

  getParent(element: NxListViewItem) {
    return this.listView.getParent(element);
  }

  getChildren(element?: NxListViewItem) {
    return this.listView.getChildren(element);
  }

  private async runTask(selection: NxListViewItem) {
    if (selection instanceof NxProjectTreeItem) {
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

  private async revealInExplorer(selection: NxListViewItem) {
    if (selection.resourceUri) {
      commands.executeCommand('revealInExplorer', selection.resourceUri);
    }
  }

  private async editWorkspaceJson(selection: NxListViewItem) {
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
