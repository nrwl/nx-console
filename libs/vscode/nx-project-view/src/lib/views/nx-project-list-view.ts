import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import {
  BaseView,
  ProjectViewItem,
  ProjectViewStrategy,
  TargetViewItem,
} from './nx-project-base-view';

export type ListViewItem = ProjectViewItem | TargetViewItem;

export type ListViewStrategy = ProjectViewStrategy<ListViewItem>;

export function createListViewStrategy(): ListViewStrategy {
  const listView = new ListView();
  return {
    getChildren: listView.getChildren.bind(listView),
  };
}

class ListView extends BaseView {
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
    const projectDefs = await getNxWorkspaceProjects();
    return Object.entries(projectDefs).map((project) =>
      this.createProjectViewItem(project)
    );
  }
}
