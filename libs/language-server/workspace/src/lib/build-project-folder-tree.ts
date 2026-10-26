import { TreeNode } from '@nx-console/shared-types';
import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import { parse } from 'path';

/*
 * Construct a tree (all nodes are saved in a map) from the project definitions by doing the following:
 * - Create a node for each project and recursively add its parent folders as nodes
 * - If a project is added where a folder exists already, overwrite the folder node
 * - In the end, if a folder with the '.' root exists, it will be the singular root node
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- dealing with maps is hard */
export function buildProjectFolderTree(
  projectNodes: Record<string, ProjectGraphProjectNode>,
): {
  serializedTreeMap: { dir: string; node: TreeNode }[];
  roots: TreeNode[];
} {
  const treeMap = new Map<string, TreeNode>();
  // Roots are tracked by directory rather than by node, because a folder node is
  // replaced by a new object once the project rooted at the same directory is added.
  const rootDirs = new Set<string>();

  function connectNodeToParent(node: TreeNode, parent: TreeNode) {
    parent.children.push(node.dir);
  }

  function addProjectOrFolderTreeNode(
    dir: string,
    projectName?: string,
    projectConfiguration?: ProjectGraphProjectNode,
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
      rootDirs.add(dir);
      return;
    }

    if (treeMap.has(parentPath)) {
      connectNodeToParent(treeMap.get(dir)!, treeMap.get(parentPath)!);
    } else {
      addProjectOrFolderTreeNode(parentPath);
      connectNodeToParent(treeMap.get(dir)!, treeMap.get(parentPath)!);
    }
  }

  for (const [projectName, projectDef] of Object.entries(projectNodes)) {
    addProjectOrFolderTreeNode(projectDef.data.root, projectName, projectDef);
  }

  // special case: if there is a '.' project, it will be the singular root
  if (treeMap.has('.')) {
    const workspaceRootProjectNode = treeMap.get('.')!;
    rootDirs.forEach((rootDir) => {
      if (rootDir === '.') {
        return;
      }
      workspaceRootProjectNode.children.push(rootDir);
    });
    rootDirs.clear();
    rootDirs.add('.');
  }

  const serializedTreeMap = Array.from(treeMap.entries()).map(
    ([dir, node]) => ({
      dir,
      node,
    }),
  );
  const roots = Array.from(rootDirs)
    .sort((a, b) => a.localeCompare(b))
    .map((dir) => treeMap.get(dir)!);

  return { serializedTreeMap, roots };
}
