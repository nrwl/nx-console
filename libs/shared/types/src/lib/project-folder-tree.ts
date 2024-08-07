import type { ProjectConfiguration } from 'nx/src/devkit-exports';

export type TreeNode = {
  dir: string;
  projectName?: string;
  projectConfiguration?: ProjectConfiguration;
  children: string[];
};
export type TreeMap = Map<string, TreeNode>;
