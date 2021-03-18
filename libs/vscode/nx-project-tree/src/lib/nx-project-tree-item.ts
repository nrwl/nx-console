import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class NxProjectTreeItem extends TreeItem {
  constructor(
    public workspaceJsonLabel: NxProjectLabel,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}

export interface NxProjectLabel {
  project: string;
  architect?: {
    name: string;
    configuration?: string;
  };
}
