import { TreeMap, TreeNode } from '@nx-console/shared/types';
import { getProjectFolderTree } from '@nx-console/vscode/nx-workspace';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { join, parse } from 'path';
import {
  BaseView,
  FolderViewItem,
  ProjectViewItem,
  ProjectViewStrategy,
  TargetViewItem,
} from './nx-project-base-view';
import { TreeItemCollapsibleState } from 'vscode';

export type TreeViewItem = FolderViewItem | ProjectViewItem | TargetViewItem;
export type TreeViewStrategy = ProjectViewStrategy<TreeViewItem>;

export type ProjectInfo = {
  dir: string;
  configuration: ProjectConfiguration;
};

export function createTreeViewStrategy(): TreeViewStrategy {
  const listView = new TreeView();
  return {
    getChildren: listView.getChildren.bind(listView),
  };
}

/* eslint-disable @typescript-eslint/no-non-null-assertion -- dealing with maps is hard */
class TreeView extends BaseView {
  treeMap: TreeMap;

  async getChildren(
    element?: TreeViewItem
  ): Promise<TreeViewItem[] | undefined> {
    if (!element) {
      const { treeMap, roots } = await getProjectFolderTree();
      this.treeMap = treeMap;
      // if there's only a single root, start with it expanded
      const isSingleProject = roots.length === 1;
      return roots
        .sort((a, b) => {
          // the VSCode tree view looks chaotic when folders and projects are on the same level
          // so we sort the nodes to have folders first and projects after
          if (!!a.projectName == !!b.projectName) {
            return a.dir.localeCompare(b.dir);
          }
          return a.projectName ? 1 : -1;
        })
        .map((root) =>
          this.createFolderOrProjectTreeItemFromNode(
            root,
            isSingleProject
              ? TreeItemCollapsibleState.Expanded
              : TreeItemCollapsibleState.Collapsed
          )
        );
    }

    if (element.contextValue === 'project') {
      const targetChildren =
        (await this.createTargetsFromProject(element)) ?? [];
      let folderAndProjectChildren: (ProjectViewItem | FolderViewItem)[] = [];
      if (element.nxProject && this.treeMap.has(element.nxProject.root)) {
        folderAndProjectChildren = this.treeMap
          .get(element.nxProject.root)!
          .children.map((folderOrProjectNode) =>
            this.createFolderOrProjectTreeItemFromNode(folderOrProjectNode)
          );
      }
      return [...targetChildren, ...folderAndProjectChildren];
    }

    if (element.contextValue === 'folder') {
      if (this.treeMap.has(element.path)) {
        return this.treeMap
          .get(element.path)!
          .children.map((folderOrProjectNode) =>
            this.createFolderOrProjectTreeItemFromNode(folderOrProjectNode)
          );
      }
    }

    if (element.contextValue === 'target') {
      return this.createConfigurationsFromTarget(element);
    }
  }

  private createFolderTreeItem(
    path: string,
    collapsible = TreeItemCollapsibleState.Collapsed
  ): FolderViewItem {
    const folderName = parse(path).base;
    /**
     * In case that a project does not have a root value.
     * Show a placeholder value instead
     */
    const label = folderName === '' ? '<root>' : folderName;

    return {
      id: `$folder:${path}`,
      contextValue: 'folder',
      path,
      label,
      resource: join(getWorkspacePath(), path),
      collapsible,
    };
  }

  private createFolderOrProjectTreeItemFromNode(
    node: TreeNode,
    collapsible = TreeItemCollapsibleState.Collapsed
  ): ProjectViewItem | FolderViewItem {
    const config = node.projectConfiguration;
    return config
      ? this.createProjectViewItem(
          [config.name ?? node.projectName ?? '', config],
          collapsible
        )
      : this.createFolderTreeItem(node.dir, collapsible);
  }
}
