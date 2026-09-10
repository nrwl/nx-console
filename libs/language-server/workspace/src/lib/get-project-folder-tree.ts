import { TreeNode } from '@nx-console/shared-types';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';
import { buildProjectFolderTree } from './build-project-folder-tree';

export async function getProjectFolderTree(workspacePath: string): Promise<{
  serializedTreeMap: { dir: string; node: TreeNode }[];
  roots: TreeNode[];
}> {
  const { projectGraph } = await nxWorkspace(workspacePath, lspLogger);

  return buildProjectFolderTree(projectGraph.nodes);
}
