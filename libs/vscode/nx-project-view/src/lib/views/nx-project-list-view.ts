import {
  BaseView,
  ProjectGraphErrorViewItem,
  ProjectViewItem,
  TargetGroupViewItem,
  TargetViewItem,
} from './nx-project-base-view';

export type ListViewItem =
  | ProjectViewItem
  | TargetViewItem
  | TargetGroupViewItem
  | ProjectGraphErrorViewItem;

export class ListView extends BaseView {
  async getChildren(element?: ListViewItem) {
    if (!element) {
      const items: ListViewItem[] = [];
      if (this.workspaceData?.errors) {
        items.push(
          this.createProjectGraphErrorViewItem(
            this.workspaceData.errors.length,
          ),
        );
      }
      // should return root elements if no element was passed
      items.push(...(await this.createProjects()));
      return items;
    }
    if (element.contextValue === 'project') {
      return this.createTargetsAndGroupsFromProject(element);
    }
    if (element.contextValue === 'targetGroup') {
      return this.createTargetsFromTargetGroup(element);
    }
    if (element.contextValue === 'projectGraphError') {
      return [];
    }
    return this.createConfigurationsFromTarget(element);
  }

  private async createProjects() {
    const projectDefs = await this.getProjectData();
    if (!projectDefs) {
      return [];
    }
    return Object.entries(projectDefs).map((project) =>
      this.createProjectViewItem(project),
    );
  }
}
