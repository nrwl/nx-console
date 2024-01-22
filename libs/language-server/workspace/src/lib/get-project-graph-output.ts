import { lspLogger } from '@nx-console/language-server/utils';
import { findNxPackagePath } from '@nx-console/shared/npm';
import { join, relative, normalize } from 'path';
import { getNxPackage } from './get-nx-workspace-package';

export async function getProjectGraphOutput(workspacePath: string) {
  const cacheDir = await getCacheDir(workspacePath);

  const directory = join(cacheDir, 'nx-console-project-graph');
  const fullPath = `${directory}/project-graph.html`;
  return {
    directory,
    relativePath: `./${normalize(relative(workspacePath, fullPath))}`,
    fullPath,
  };
}

async function getCacheDir(workspacePath: string): Promise<string> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'cache-directory.js')
  );

  return ((await getNxPackage(importPath, lspLogger)) as any).cacheDir;
}
