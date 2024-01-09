import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { ViewItem } from './nx-project-tree-provider';
import { getStoredCollapsibleState } from './tree-item-collapsible-store';
import {
  NxProject,
  NxTarget,
  ProjectViewItem,
  TargetViewItem,
} from './views/nx-project-base-view';

export class NxTreeItem extends TreeItem {
  id: string;

  constructor(public readonly item: ViewItem) {
    let collapsibleState: TreeItemCollapsibleState;
    if (item.collapsible === TreeItemCollapsibleState.None) {
      collapsibleState = TreeItemCollapsibleState.None;
    } else {
      collapsibleState = getStoredCollapsibleState(item.id) ?? item.collapsible;
    }
    super(item.label, collapsibleState);

    this.id = item.id;
    this.contextValue = item.contextValue;
    if (item.contextValue === 'folder' || item.contextValue === 'project') {
      this.resourceUri = Uri.file(item.resource);
    }

    this.setIcons();
  }

  setIcons() {
    if (this.contextValue === 'folder') {
      this.iconPath = new ThemeIcon('folder');
    }
    if (this.contextValue === 'project') {
      this.iconPath = new ThemeIcon('package');
    }
    if (this.contextValue === 'target') {
      this.iconPath = new ThemeIcon('symbol-property');
    }
  }

  public getProject(): NxProject | undefined {
    if (this.contextValue === 'project') {
      return (this.item as ProjectViewItem).nxProject as NxProject;
    } else if (this.contextValue === 'target') {
      return (this.item as TargetViewItem).nxProject as NxProject;
    }
  }

  public getTarget(): NxTarget | undefined {
    if (this.contextValue === 'target') {
      return (this.item as TargetViewItem).nxTarget as NxTarget;
    }
  }
}
