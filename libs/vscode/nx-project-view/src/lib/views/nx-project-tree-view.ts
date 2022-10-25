import { ProjectConfiguration } from '@nrwl/devkit';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { TreeItemCollapsibleState } from 'vscode';
import {
  NxFolderTreeItem,
  NxProjectTreeItem,
  NxTreeViewItem,
} from '../nx-project-tree-item';
import { BaseView, ProjectViewStrategy } from './nx-project-base-view';
import { isDefined, PathHelper } from './nx-project-util';
import path = require('node:path');

export type TreeViewStrategy = ProjectViewStrategy<NxTreeViewItem>;
type TreeViewMap = Map<string, [string, ProjectConfiguration][]>;

export function createTreeViewStrategy(
  cliTaskProvider: CliTaskProvider
): TreeViewStrategy {
  const listView = new TreeView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
  };
}

class TreeView extends BaseView {
  constructor(cliTaskProvider: CliTaskProvider) {
    super(cliTaskProvider);
  }

  async getChildren(element?: NxTreeViewItem) {
    if (!element) {
      return this.createRootFolders();
    }
    if (element instanceof NxFolderTreeItem) {
      return this.createFoldersOrProjectFromFolder(element);
    }
    if (element instanceof NxProjectTreeItem) {
      return this.createTargetsFromProject(element);
    }
    return this.createConfigurationsFromTarget(element);
  }

  private async createRootFolders() {
    const projectDefs = await this.cliTaskProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    const rootFolders = this.getRootFolders(map);
    return rootFolders.map(([path]) => this.createTreeItemFromPath(path));
  }

  private async createFoldersOrProjectFromFolder(parent: NxFolderTreeItem) {
    const projectDefs = await this.cliTaskProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    const subFolders = this.getSubFolders(map, parent.path);
    return subFolders.map(([path, projects]) =>
      this.createTreeItemFromPath(path, projects)
    );
  }

  private createTreeItemFromPath(
    path: string,
    projects?: [string, ProjectConfiguration][]
  ) {
    if (projects && projects.length === 1) {
      const [project] = projects;
      return this.createProjectTreeItem(project);
    }
    return this.createFolderTreeItem(path);
  }

  private createFolderTreeItem(path: string) {
    const folderName = PathHelper.getFolderName(path);
    return new NxFolderTreeItem(
      path,
      this.cliTaskProvider.getWorkspacePath(),
      folderName,
      TreeItemCollapsibleState.Collapsed
    );
  }

  /**
   * Groups the ProjectConfiguration by directory.
   * Each entry is added n times.
   * n is determined by the directory depth.
   */
  private groupByRootPath(projectDefs: {
    [projectName: string]: ProjectConfiguration;
  }): TreeViewMap {
    return Object.entries(projectDefs)
      .flatMap((project) => {
        const [projectName, projectDef] = project;
        const { root } = projectDef;
        if (root === undefined) {
          getOutputChannel().appendLine(
            `Project ${projectName} has no root. This could be because of an error loading the workspace configuration.`
          );
          return;
        }
        return this.createPathPermutations(root).map(
          (dir) => [dir, project] as const
        );
      })
      .filter(isDefined)
      .reduce<TreeViewMap>((map, [dir, project]) => {
        const list = map.get(dir) ?? [];
        list.push(project);
        return map.set(dir, list);
      }, new Map());
  }

  /**
   * Create a permutation for each sub directory.
   * @example
   * input: 'libs/shared/collections'
   * output: [
   *   'libs/shared/collections'
   *   'libs/shared'
   *   'libs'
   * ]
   */
  private createPathPermutations(dir: string) {
    const parts = PathHelper.dirs(dir).reverse();
    const permutations: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const partialDir = path.join(...parts.slice(i).reverse());
      permutations.push(partialDir);
    }
    return permutations;
  }

  private getRootFolders(map: TreeViewMap) {
    return Array.from(map.entries()).filter(([key]) => PathHelper.isRoot(key));
  }

  private getSubFolders(map: TreeViewMap, path: string) {
    const depth = PathHelper.getDepth(path);

    return Array.from(map.entries()).filter(
      ([key]) => key.includes(path) && PathHelper.getDepth(key) === depth + 1
    );
  }
}
