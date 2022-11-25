import { readdir,stat } from 'fs/promises';
import { join } from 'path';

/**
 * Get a flat list of all node_modules folders in the workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param workspacePath
 * @returns
 */
export async function npmDependencies(workspacePath: string) {
  const nodeModulesDir = join(workspacePath, 'node_modules');
  const res: string[] = [];
  const stats = await stat(nodeModulesDir);
  if (!stats.isDirectory()) {
    return res;
  }

  const dirContents = await readdir(nodeModulesDir);

  for (const npmPackageOrScope of dirContents) {
    if (npmPackageOrScope.startsWith('.')) {
      continue;
    }

    const packageStats = await stat(join(nodeModulesDir, npmPackageOrScope));
    if (!packageStats.isDirectory()) {
      continue;
    }

    if (npmPackageOrScope.startsWith('@')) {
      (await readdir(join(nodeModulesDir, npmPackageOrScope))).forEach((p) => {
        res.push(`${nodeModulesDir}/${npmPackageOrScope}/${p}`);
      });
    } else {
      res.push(`${nodeModulesDir}/${npmPackageOrScope}`);
    }
  }

  return res;
}
