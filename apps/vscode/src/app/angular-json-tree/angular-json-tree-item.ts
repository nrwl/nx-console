import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class AngularJsonTreeItem extends TreeItem {
  constructor(
    public angularJsonLabel: AngularJsonLabel,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);

    if (collapsibleState) {
      this.command = {
        title: 'Expand/contract angular.json tree-item',
        command: 'angularConsole.toggleTreeItem'
      };
    }
  }
}

export interface AngularJsonLabel {
  project: string;
  architect?: {
    name: string;
    configuration?: string;
  };
}
