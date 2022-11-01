import { CliTaskProvider } from '@nx-console/vscode/tasks';
import {
  BaseView,
  ListViewItem,
  ProjectViewStrategy,
} from './nx-project-base-view';

export type ListViewStrategy = ProjectViewStrategy<ListViewItem>;

export function createListViewStrategy(
  cliTaskProvider: CliTaskProvider
): ListViewStrategy {
  const listView = new ListView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
  };
}

class ListView extends BaseView {
  constructor(cliTaskProvider: CliTaskProvider) {
    super(cliTaskProvider);
  }

  async getChildren(element?: ListViewItem) {
    if (!element) {
      // should return root elements if no element was passed
      return this.createProjects();
    }
    if (element.contextValue === 'project') {
      return this.createTargetsFromProject(element);
    }
    return this.createConfigurationsFromTarget(element);
  }

  private async createProjects() {
    const projectDefs = await this.cliTaskProvider.getProjects();
    return Object.entries(projectDefs).map((project) =>
      this.createProjectViewItem(project)
    );
  }
}
