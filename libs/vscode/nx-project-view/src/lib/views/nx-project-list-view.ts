import { WatcherRunningService } from '@nx-console/vscode-lsp-client';
import {
  BaseView,
  DaemonDisabledViewItem,
  DaemonWatcherNotRunningViewItem,
  ProjectGraphErrorViewItem,
  ProjectViewItem,
  TargetGroupViewItem,
  TargetViewItem,
} from './nx-project-base-view';

export type ListViewItem =
  | ProjectViewItem
  | TargetViewItem
  | TargetGroupViewItem
  | ProjectGraphErrorViewItem
  | DaemonDisabledViewItem
  | DaemonWatcherNotRunningViewItem;

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
      const watcherStatus = WatcherRunningService.INSTANCE.status;
      if (watcherStatus === 'daemonDisabled') {
        items.push(this.createDaemonDisabledViewItem());
      } else if (watcherStatus === 'notRunning') {
        items.push(this.createDaemonWatcherNotRunningViewItem());
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
    if (element.contextValue === 'target') {
      return this.createConfigurationsFromTarget(element);
    }
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
