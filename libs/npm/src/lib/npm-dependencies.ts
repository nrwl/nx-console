import { stat, readdir } from 'fs/promises';
import { join } from 'path';

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
