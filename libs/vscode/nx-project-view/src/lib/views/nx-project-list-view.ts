import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import {
  BaseView,
  ProjectViewItem,
  TargetGroupViewItem,
  TargetViewItem,
} from './nx-project-base-view';

export type ListViewItem =
  | ProjectViewItem
  | TargetViewItem
  | TargetGroupViewItem;

export class ListView extends BaseView {
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
    const projectDefs = this.workspaceData?.workspace.projects;
    if (!projectDefs) {
      return [];
    }
    return Object.entries(projectDefs).map((project) =>
      this.createProjectViewItem(project)
    );
  }
}
