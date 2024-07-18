import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import {
  BaseView,
  ProjectViewItem,
  ProjectViewStrategy,
  TargetGroupViewItem,
  TargetViewItem,
} from './nx-project-base-view';

export type ListViewItem =
  | ProjectViewItem
  | TargetViewItem
  | TargetGroupViewItem;

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
      return this.createTargetsAndGroupsFromProject(element);
    }
    if (element.contextValue === 'targetGroup') {
      return this.createTargetsFromTargetGroup(element);
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
