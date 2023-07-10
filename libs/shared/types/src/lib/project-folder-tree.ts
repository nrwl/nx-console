import { ProjectConfiguration } from 'nx/src/devkit-exports';

export type TreeNode = {
  dir: string;
  projectName?: string;
  projectConfiguration?: ProjectConfiguration;
  children: TreeNode[];
};
export type TreeMap = Map<string, TreeNode>;
