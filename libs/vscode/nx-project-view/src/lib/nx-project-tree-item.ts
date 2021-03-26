import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class NxProjectTreeItem extends TreeItem {
  constructor(
    public nxProject: NxProject,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}

export interface NxProject {
  project: string;
  target?: {
    name: string;
    configuration?: string;
  };
}
