import { TreeNode } from '@nx-console/shared-types';
import { parse } from 'path';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import { lspLogger } from '@nx-console/language-server-utils';

/*
 * Construct a tree (all nodes are saved in a map) from the project definitions by doing the following:
 * - Create a node for each project and recursively add its parent folders as nodes
 * - If a project is added where a folder exists already, overwrite the folder node
 * - In the end, if a folder with the '.' root exists, it will be the singular root node
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- dealing with maps is hard */
export async function getProjectFolderTree(workspacePath: string): Promise<{
  serializedTreeMap: { dir: string; node: TreeNode }[];
  roots: TreeNode[];
}> {
  const { projectGraph } = await nxWorkspace(workspacePath, lspLogger);

  const treeMap = new Map<string, TreeNode>();
  const roots = new Set<TreeNode>();

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

  for (const [projectName, projectDef] of Object.entries(projectGraph.nodes)) {
    addProjectOrFolderTreeNode(projectDef.data.root, projectName, projectDef);
  }

  // special case: if there is a '.' project, it will be the singular root
  if (treeMap.has('.')) {
    const workspaceRootProjectNode = treeMap.get('.');
    roots.forEach((root) => {
      if (root.projectConfiguration?.data.root === '.') {
        return;
      }
      workspaceRootProjectNode?.children.push(root.dir);
    });
    roots.clear();
    roots.add(workspaceRootProjectNode!);
  }
  const serializedTreeMap = Array.from(treeMap.entries()).map(
    ([dir, node]) => ({
      dir,
      node,
    }),
  );
  const sortedRoots = Array.from(roots).sort((a, b) => {
    return a.dir.localeCompare(b.dir);
  });
  return { serializedTreeMap, roots: sortedRoots };
}
