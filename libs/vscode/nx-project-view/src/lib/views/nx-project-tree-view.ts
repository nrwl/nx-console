import { ProjectConfiguration } from '@nrwl/devkit';
import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { join, parse } from 'path';
import {
  BaseView,
  FolderViewItem,
  ProjectViewItem,
  ProjectViewStrategy,
  TargetViewItem,
} from './nx-project-base-view';

export type TreeViewItem = FolderViewItem | ProjectViewItem | TargetViewItem;
export type TreeViewStrategy = ProjectViewStrategy<TreeViewItem>;

type TreeNode = {
  dir: string;
  projectName?: string;
  projectConfiguration?: ProjectConfiguration;
  children: TreeNode[];
};
type TreeMap = Map<string, TreeNode>;
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
      const projectDefs = await getNxWorkspaceProjects();
      const [treeMap, roots] = this.constructTreeMap(projectDefs);
      this.treeMap = treeMap;
      return roots.map((root) =>
        this.createFolderOrProjectTreeItemFromNode(root)
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

  /*
   * Construct a tree (all nodes are saved in a map) from the project definitions by doing the following:
   * - Create a node for each project and recursively add its parent folders as nodes
   * - If a project is added where a folder exists already, overwrite the folder node
   * - In the end, if a folder with the '.' root exists, it will be the singular root node
   */
  private constructTreeMap(projectDefs: {
    [projectName: string]: ProjectConfiguration;
  }): [TreeMap, TreeNode[]] {
    const treeMap = new Map<string, TreeNode>();
    const roots = new Set<TreeNode>();

    function connectNodeToParent(node: TreeNode, parent: TreeNode) {
      parent.children.push(node);
    }

    function addProjectOrFolderTreeNode(
      dir: string,
      projectName?: string,
      projectConfiguration?: ProjectConfiguration
    ) {
      // if a node is only a folder and exists already, we don't need to add it again
      if (!projectConfiguration && !projectName && treeMap.has(dir)) {
        return;
      }

      // if a node is a project and exists already, we need to replace the folder node with a new project node
      if (projectConfiguration && projectName && treeMap.has(dir)) {
        const oldNode = treeMap.get(dir)!;
        treeMap.set(dir, {
          dir,
          projectName: projectName,
          projectConfiguration,
          children: oldNode.children,
        });
        return;
      }

      // if a node doesn't exist, we need to add it
      const treeNode = {
        dir,
        projectName,
        projectConfiguration,
        children: [],
      };
      treeMap.set(dir, treeNode);

      // after adding, we need to connect it to its parent or create it if it doesn't exist
      // if there is no parent, the node is a root
      const parentPath = parse(dir).dir;
      if (!parentPath) {
        roots.add(treeNode);
        return;
      }

      if (treeMap.has(parentPath)) {
        connectNodeToParent(treeMap.get(dir)!, treeMap.get(parentPath)!);
      } else {
        addProjectOrFolderTreeNode(parentPath);
        connectNodeToParent(treeMap.get(dir)!, treeMap.get(parentPath)!);
      }
    }

    for (const [projectName, projectDef] of Object.entries(projectDefs)) {
      addProjectOrFolderTreeNode(projectDef.root, projectName, projectDef);
    }

    // special case: if there is a '.' project, it will be the singular root
    if (treeMap.has('.')) {
      const workspaceRootProjectNode = treeMap.get('.');
      roots.forEach((root) => {
        if (root.projectConfiguration?.root === '.') {
          return;
        }
        workspaceRootProjectNode?.children.push(root);
      });
      roots.clear();
      roots.add(workspaceRootProjectNode!);
    }

    return [treeMap, [...roots]];
  }

  private createFolderTreeItem(path: string): FolderViewItem {
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
      collapsible: 'Collapsed',
    };
  }

  private createFolderOrProjectTreeItemFromNode(
    node: TreeNode
  ): ProjectViewItem | FolderViewItem {
    const config = node.projectConfiguration;
    return config
      ? this.createProjectViewItem([
          config.name ?? node.projectName ?? '',
          config,
        ])
      : this.createFolderTreeItem(node.dir);
  }
}
