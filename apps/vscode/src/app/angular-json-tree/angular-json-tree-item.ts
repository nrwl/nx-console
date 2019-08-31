import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class AngularJsonTreeItem extends TreeItem {
  constructor(
    public angularJsonLabel: AngularJsonLabel,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}

export interface AngularJsonLabel {
  project: string;
  architect?: {
    name: string;
    configuration?: string;
  };
}
