import { ProjectConfiguration } from '@nrwl/devkit';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { TreeItemCollapsibleState } from 'vscode';
import { AbstractView, isDefined, TreeViewStrategy } from './nx-project-helper';
import {
  NxFolderTreeItem,
  NxProjectTreeItem,
  NxTreeViewItem,
} from './nx-project-tree-item';

type TreeViewMap = Map<string, [string, ProjectConfiguration][]>;

export function createTreeViewStrategy(
  cliTaskProvider: CliTaskProvider
): TreeViewStrategy {
  const listView = new TreeView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
    getParent: listView.getParent.bind(listView),
  };
}

class TreeView extends AbstractView {
  constructor(cliTaskProvider: CliTaskProvider) {
    super(cliTaskProvider);
  }
  async getParent(element: NxTreeViewItem) {
    if (element instanceof NxFolderTreeItem) {
      if (this.isRootPath(element.path)) {
        return null;
      }
      const projectDefs = await this.cliTaskProvider.getProjects();
      const map = this.groupByRootPath(projectDefs);
      const parentFolders = this.getParentFolder(map, element.path);
      return parentFolders.map(([path]) => this.createFolderTreeItem(path));
    }

    if (element instanceof NxProjectTreeItem) {
      const projectRoot = element.nxProject.root;
      const projectDefs = await this.cliTaskProvider.getProjects();
      const map = this.groupByRootPath(projectDefs);
      const parentFolders = this.getParentFolder(map, projectRoot);
      return parentFolders.map(([path]) => this.createFolderTreeItem(path));
    }

    return this.getParentOfTargetItem(element);
  }

  async getChildren(element?: NxTreeViewItem) {
    if (!element) {
      return this.createFolders();
    }
    if (element instanceof NxFolderTreeItem) {
      return this.createFolders(element);
    }
    if (element instanceof NxProjectTreeItem) {
      return this.createTargetsFormProject(element);
    }
    return this.createConfigurationsFormTarget(element);
  }

  private async createFolders(parent?: NxFolderTreeItem) {
    const projectDefs = await this.cliTaskProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    if (!parent) {
      const rootFolders = this.getRootFolders(map);
      return rootFolders.map(([path]) => this.createFolderTreeItem(path));
    }

    const subFolders = this.getSubFolders(map, parent.path);
    return subFolders.map(([path, projects]) =>
      this.createFolderTreeItem(path, projects)
    );
  }

  private createFolderTreeItem(
    path: string,
    projects?: [string, ProjectConfiguration][]
  ) {
    if (projects && projects.length === 1) {
      const [project] = projects;
      return this.createProjectTreeItem(project);
    }

    const folderName = path.split('/').pop() ?? '';
    const item = new NxFolderTreeItem(
      path,
      folderName,
      TreeItemCollapsibleState.Collapsed
    );

    item.contextValue = 'folder';
    return item;
  }

  /**
   * Groups the ProjectConfiguration by directory.
   * Each entry is added n times.
   * n is determined by the directory depth.
   */
  private groupByRootPath(projectDefs: {
    [projectName: string]: ProjectConfiguration;
  }) {
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
    const parts = dir.split('/').reverse();
    const permutations: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const partialDir = parts.slice(i).reverse().join('/');
      permutations.push(partialDir);
    }
    return permutations;
  }

  private getRootFolders(map: TreeViewMap) {
    return Array.from(map.entries()).filter(([key]) => this.isRootPath(key));
  }

  private getSubFolders(map: TreeViewMap, path: string) {
    const depth = this.getPathDepth(path);

    return Array.from(map.entries()).filter(
      ([key]) => key.includes(path) && this.getPathDepth(key) === depth + 1
    );
  }

  private getParentFolder(map: TreeViewMap, path: string) {
    const depth = this.getPathDepth(path);
    const parentPath = path.split('/').reverse().slice(1).reverse().join('/');

    return Array.from(map.entries()).filter(
      ([key]) =>
        key.includes(parentPath) && this.getPathDepth(key) === depth - 1
    );
  }

  private getPathDepth(path: string) {
    return path.split('/').length;
  }

  private isRootPath(path: string) {
    return this.getPathDepth(path) === 1;
  }
}
