import { join } from 'node:path';
import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

export interface NxProject {
  project: string;
  root: string;
}

export interface NxTarget {
  name: string;
  configuration?: string;
}

export type NxListViewItem = NxProjectTreeItem | NxTargetTreeItem;
export type NxTreeViewItem =
  | NxProjectTreeItem
  | NxTargetTreeItem
  | NxFolderTreeItem;
export type NxTreeItem = NxListViewItem | NxTreeViewItem;

export class NxFolderTreeItem extends TreeItem {
  constructor(
    public path: string,
    workspacePath: string,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
    this.resourceUri = Uri.file(join(workspacePath, path));
    this.contextValue = 'folder';
  }
}

export class NxProjectTreeItem extends TreeItem {
  constructor(
    public nxProject: NxProject,
    workspacePath: string,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);
    this.resourceUri = Uri.file(join(workspacePath, nxProject.root ?? ''));
    this.contextValue = 'project';
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
    this.contextValue = 'task';
  }
}
