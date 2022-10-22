import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { NxListViewItem, NxProjectTreeItem } from '../nx-project-tree-item';
import { BaseView, ProjectViewStrategy } from './nx-project-base-view';

export type ListViewStrategy = ProjectViewStrategy<NxListViewItem>;

export function createListViewStrategy(
  cliTaskProvider: CliTaskProvider
): ListViewStrategy {
  const listView = new ListView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
    getParent: listView.getParent.bind(listView),
  };
}

class ListView extends BaseView {
  constructor(cliTaskProvider: CliTaskProvider) {
    super(cliTaskProvider);
  }

  async getParent(element: NxListViewItem) {
    if (element instanceof NxProjectTreeItem) {
      // is already root level
      return null;
    }

    return this.getParentOfTargetItem(element);
  }

  async getChildren(element?: NxListViewItem) {
    if (!element) {
      // should return root elements if no element was passed
      return this.createProjects();
    }
    if (element instanceof NxProjectTreeItem) {
      return this.createTargetsFormProject(element);
    }
    return this.createConfigurationsFormTarget(element);
  }

  private async createProjects() {
    const projectDefs = await this.cliTaskProvider.getProjects();
    return Object.entries(projectDefs).map((project) =>
      this.createProjectTreeItem(project)
    );
  }
}
