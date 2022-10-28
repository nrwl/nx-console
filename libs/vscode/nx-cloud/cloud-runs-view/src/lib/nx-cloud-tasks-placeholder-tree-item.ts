import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { NxCloudRunTreeItem } from './nx-cloud-run-tree-item';

export class NxCloudTasksPlaceholderTreeItem extends TreeItem {
  constructor(public parent: NxCloudRunTreeItem) {
    super('', TreeItemCollapsibleState.Collapsed);
    this.description = 'Show tasks';
  }
}
