import { ProjectConfiguration } from '@nrwl/devkit';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { join } from 'node:path';
import {
  BaseView,
  FolderViewItem,
  ProjectViewStrategy,
  TreeViewItem,
  ViewDataProvider,
} from './nx-project-base-view';
import { isDefined, PathHelper } from './nx-project-util';

export type TreeViewStrategy = ProjectViewStrategy<TreeViewItem>;
type TreeViewMap = Map<string, [string, ProjectConfiguration][]>;

export function createTreeViewStrategy(
  cliTaskProvider: ViewDataProvider
): TreeViewStrategy {
  const listView = new TreeView(cliTaskProvider);
  return {
    getChildren: listView.getChildren.bind(listView),
  };
}

class TreeView extends BaseView {
  private pathHelper = new PathHelper();

  constructor(cliTaskProvider: ViewDataProvider) {
    super(cliTaskProvider);
  }

  async getChildren(element?: TreeViewItem) {
    if (!element) {
      return this.createRoot();
    }
    if (element.contextValue === 'folder') {
      return this.createFoldersOrProjectFromFolder(element);
    }
    if (element.contextValue === 'project') {
      return this.createTargetsFromProject(element);
    }
    return this.createConfigurationsFromTarget(element);
  }

  private async createRoot() {
    const projectDefs = await this.cliTaskProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    if (map.size === 0 && Object.keys(projectDefs).length > 0) {
      // An angular project has its root project dir at ''
      // Therefore, the map will be empty
      const [[projectName, projectDef]] = Object.entries(projectDefs);
      return [this.createProjectViewItem([projectName, projectDef])];
    }

    const rootFolders = this.getRootFolders(map);
    return rootFolders.map(([path]) => this.createTreeItemFromPath(path));
  }

  private async createFoldersOrProjectFromFolder(parent: FolderViewItem) {
    const projectDefs = await this.cliTaskProvider.getProjects();
    const map = this.groupByRootPath(projectDefs);

    /**
     * In case that the parent is the <root> placeholder, then the children can only be projects
     */
    if (parent.path === '') {
      return map.get('')?.map((project) => this.createProjectViewItem(project));
    }

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
      return this.createProjectViewItem(project);
    }
    return this.createFolderTreeItem(path);
  }

  private createFolderTreeItem(path: string): FolderViewItem {
    const folderName = this.pathHelper.getFolderName(path);
    /**
     * In case that a project does not have a root value.
     * Show a placeholder value instead
     */
    const label = folderName === '' ? '<root>' : folderName;

    return {
      contextValue: 'folder',
      path,
      label,
      resource: join(this.cliTaskProvider.getWorkspacePath(), path),
      collapsible: 'Collapsed',
    };
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
