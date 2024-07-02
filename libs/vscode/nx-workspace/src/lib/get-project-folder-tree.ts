import { NxProjectFolderTreeRequest } from '@nx-console/language-server/types';
import { TreeMap, TreeNode } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';

export async function getProjectFolderTree(): Promise<
  | {
      treeMap: TreeMap;
      roots: TreeNode[];
    }
  | undefined
> {
  const res = await sendRequest(NxProjectFolderTreeRequest, {});
  if (!res) {
    return undefined;
  }
  return {
    treeMap: new Map(res.serializedTreeMap.map((n) => [n.dir, n.node])),
    roots: res.roots,
  };
}
