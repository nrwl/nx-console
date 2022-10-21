import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export interface NxProject {
  project: string;
  root: string;
}

export interface NxTarget {
  name: string;
  configuration?: string;
}

export type NxTreeItem = NxListViewItem | NxTreeViewItem;
export type NxListViewItem = NxProjectTreeItem | NxTargetTreeItem;
export type NxTreeViewItem =
  | NxProjectTreeItem
  | NxTargetTreeItem
  | NxFolderTreeItem;

export class NxFolderTreeItem extends TreeItem {
  constructor(
    public path: string,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}

export class NxProjectTreeItem extends TreeItem {
  constructor(
    public nxProject: NxProject,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}

export class NxTargetTreeItem extends TreeItem {
  constructor(
    public nxProject: NxProject,
    public nxTarget: NxTarget,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
  }
}
