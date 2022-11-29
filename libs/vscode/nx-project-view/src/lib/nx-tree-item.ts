import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { ViewItem } from './nx-project-tree-provider';
import { getStoredCollapsibleState } from './tree-item-collapsible-store';

export class NxTreeItem extends TreeItem {
  id: string;

  constructor(public readonly item: ViewItem) {
    let collapsibleState: TreeItemCollapsibleState;
    if (item.collapsible === 'None') {
      collapsibleState = TreeItemCollapsibleState.None;
    } else {
      collapsibleState =
        getStoredCollapsibleState(item.id) ??
        TreeItemCollapsibleState[item.collapsible];
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
}
