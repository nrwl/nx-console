import { ThemeIcon, TreeItem, Uri } from 'vscode';
import { ViewItem } from './nx-project-tree-provider';
import {
  NxProject,
  NxTarget,
  ProjectViewItem,
  TargetViewItem,
} from './views/nx-project-base-view';
import { ATOMIZED_SCHEME } from './atomizer-decorations';

export class NxTreeItem extends TreeItem {
  id: string;

  constructor(public readonly item: ViewItem) {
    super(item.label, item.collapsible);

    this.id = item.id;
    this.contextValue = item.contextValue;

    if (item.contextValue === 'folder' || item.contextValue === 'project') {
      this.resourceUri = Uri.file(item.resource);
    } else if (item.contextValue === 'target' && !!item.nonAtomizedTarget) {
      this.resourceUri = Uri.from({
        scheme: ATOMIZED_SCHEME,
        path: item.nxTarget.name,
      });
      this.contextValue = 'target-atomized';
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
    if (this.contextValue === 'targetGroup') {
      this.iconPath = new ThemeIcon('layers');
    }
    if (
      this.contextValue === 'target' ||
      this.contextValue === 'target-atomized'
    ) {
      this.iconPath = new ThemeIcon('symbol-property');
    }
  }

  public getProject(): NxProject | undefined {
    if (this.contextValue === 'project') {
      return (this.item as ProjectViewItem).nxProject as NxProject;
    } else if (
      this.contextValue === 'target' ||
      this.contextValue === 'target-atomized'
    ) {
      return (this.item as TargetViewItem).nxProject as NxProject;
    }
  }

  public getTarget(): NxTarget | undefined {
    if (
      this.contextValue === 'target' ||
      this.contextValue === 'target-atomized'
    ) {
      return (this.item as TargetViewItem).nxTarget as NxTarget;
    }
  }
}
