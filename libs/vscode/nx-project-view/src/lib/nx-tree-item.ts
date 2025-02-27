import { ThemeIcon, TreeItem, Uri } from 'vscode';
import { ViewItem } from './nx-project-tree-provider';
import {
  NxProject,
  NxTarget,
  ProjectViewItem,
  TargetViewItem,
} from './views/nx-project-base-view';
import { ATOMIZED_SCHEME } from './atomizer-decorations';
import { PROJECT_GRAPH_ERROR_DECORATION_SCHEME } from './project-graph-error-decorations';

export class NxTreeItem extends TreeItem {
  constructor(public readonly item: ViewItem) {
    super(item.label, item.collapsible);

    this.id = item.id;
    this.description = item.description;
    this.tooltip = item.tooltip;
    this.contextValue = item.contextValue;

    if (item.contextValue === 'folder' || item.contextValue === 'project') {
      this.resourceUri = Uri.file(item.resource);
    } else if (item.contextValue === 'target' && !!item.nonAtomizedTarget) {
      this.resourceUri = Uri.from({
        scheme: ATOMIZED_SCHEME,
        path: item.nxTarget.name,
      });
      this.contextValue = 'target-atomized';
    } else if (item.contextValue === 'projectGraphError') {
      this.resourceUri = Uri.from({
        scheme: PROJECT_GRAPH_ERROR_DECORATION_SCHEME,
        path: item.errorCount.toString(),
      });
      this.tooltip = `${item.errorCount} errors detected. The project graph may be missing some information`;
    }

    this.setIcons(item.iconPath);
  }

  setIcons(customIconPath?: string) {
    if (this.contextValue === 'projectGraphError') {
      this.iconPath = new ThemeIcon('error');
      return;
    }
    if (customIconPath) {
      this.iconPath = customIconPath;
      return;
    }
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
