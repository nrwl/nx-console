import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { NxCloudRunTreeData } from './nx-cloud-run';
import { NxCloudTreeDataBase } from './nx-cloud-tree-data-base';

export class NxCloudTasksPlaceholderTreeData extends NxCloudTreeDataBase {
  static readonly type = 'NxCloudTasksPlaceholder';
  parent: NxCloudRunTreeData;

  constructor(parent: NxCloudRunTreeData) {
    super();
    this.parent = parent;
  }
}
export class NxCloudTasksPlaceholderTreeItem extends TreeItem {
  constructor(_: NxCloudTasksPlaceholderTreeData) {
    super('', TreeItemCollapsibleState.Collapsed);
    this.description = 'Show tasks';
  }
}
