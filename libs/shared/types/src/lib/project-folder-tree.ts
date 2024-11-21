import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';

export type TreeNode = {
  dir: string;
  projectName?: string;
  projectConfiguration?: ProjectGraphProjectNode;
  children: string[];
};
export type TreeMap = Map<string, TreeNode>;
