import { ProjectConfiguration } from '@nrwl/devkit';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { TreeItemCollapsibleState } from 'vscode';
import {
  NxFolderTreeItem,
  NxProjectTreeItem,
  NxTreeViewItem,
} from '../nx-project-tree-item';
import {
  BaseView,
  ProjectDefinition,
  ProjectViewStrategy,
} from './nx-project-base-view';
import { isDefined, objectEntries, PathHelper } from './nx-project-util';

export type TreeViewStrategy = ProjectViewStrategy<NxTreeViewItem>;
type TreeViewMapValue = Array<
  [string, ProjectConfiguration | string] | [string, string]
>;
type TreeViewMap = Map<string, TreeViewMapValue>;

export function createTreeViewStrategy(
  cliTaskProvider: CliTaskProvider
): TreeViewStrategy {
  const listView = new TreeView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
  };
}

class TreeView extends BaseView {
  private pathHelper = new PathHelper();

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
    const projectDefs = await this.infoProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    const rootFolders = this.getRootFolders(map);
    return rootFolders.map(([path]) => this.createTreeItemFromPath(path));
  }

  private async createFoldersOrProjectFromFolder(parent: NxFolderTreeItem) {
    const projectDefs = await this.infoProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    const subFolders = this.getSubFolders(map, parent.path);
    return subFolders.map(([path, projects]) =>
      this.createTreeItemFromPath(path, projects)
    );
  }

  private createTreeItemFromPath(path: string, projects?: TreeViewMapValue) {
    if (projects && projects.length === 1) {
      const [[projectName, projectDef]] = projects;

      if (typeof projectDef === 'string') {
        return;
      }
      return this.createProjectTreeItem([projectName, projectDef]);
    }
    return this.createFolderTreeItem(path);
  }

  private createFolderTreeItem(path: string) {
    const folderName = this.pathHelper.getFolderName(path);
    return new NxFolderTreeItem(
      path,
      this.infoProvider.getWorkspacePath(),
      folderName,
      TreeItemCollapsibleState.Collapsed
    );
  }

  /**
   * Groups the ProjectConfiguration by directory.
   * Each entry is added n times.
   * n is determined by the directory depth.
   */
  private groupByRootPath(projectDefs: ProjectDefinition): TreeViewMap {
    return objectEntries(projectDefs)
      .flatMap((project) => {
        const [projectName, projectDef] = project;
        const nodeModulesInstalled = typeof projectDef === 'string';

        const root = nodeModulesInstalled ? projectDef : projectDef.root;
        if (root === undefined) {
          getOutputChannel().appendLine(
            `Project ${projectName} has no root. This could be because of an error loading the workspace configuration.`
          );
          return;
        }
        return this.pathHelper
          .createPathPermutations(root)
          .map((dir) => [dir, project] as const);
      })
      .filter(isDefined)
      .reduce<TreeViewMap>((map, [dir, project]) => {
        const list = map.get(dir) ?? [];
        list.push(project);
        return map.set(dir, list);
      }, new Map());
  }

  private getRootFolders(map: TreeViewMap) {
    return Array.from(map.entries()).filter(([key]) =>
      this.pathHelper.isRoot(key)
    );
  }

  private getSubFolders(map: TreeViewMap, path: string) {
    const depth = this.pathHelper.getDepth(path);

    return Array.from(map.entries()).filter(
      ([key]) =>
        key.includes(path) && this.pathHelper.getDepth(key) === depth + 1
    );
  }
}
