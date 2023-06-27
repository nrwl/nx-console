import { stat, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Get a flat list of all node_modules folders in the workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param workspacePath
 * @returns
 */
export async function npmDependencies(workspacePath: string) {
  const nodeModules = join(workspacePath, 'node_modules');
  const nodeModulesEncapsulated = join(
    workspacePath,
    '.nx',
    'installation',
    'node_modules'
  );

  let nodeModulesDir = nodeModules;

  const res: string[] = [];
  try {
    if (!(await stat(nodeModules)).isDirectory()) {
      return res;
    }
  } catch {
    try {
      if (!(await stat(nodeModulesEncapsulated)).isDirectory()) {
        return res;
      } else {
        nodeModulesDir = nodeModulesEncapsulated;
      }
    } catch {
      return res;
    }
  }

  const dirContents = await readdir(nodeModulesDir);

  for (const npmPackageOrScope of dirContents) {
    try {
      if (npmPackageOrScope.startsWith('.')) {
        continue;
      }

      const packageStats = await stat(join(nodeModulesDir, npmPackageOrScope));
      if (!packageStats.isDirectory()) {
        continue;
      }

      if (npmPackageOrScope.startsWith('@')) {
        (await readdir(join(nodeModulesDir, npmPackageOrScope))).forEach(
          (p) => {
            res.push(`${nodeModulesDir}/${npmPackageOrScope}/${p}`);
          }
        );
      } else {
        res.push(`${nodeModulesDir}/${npmPackageOrScope}`);
      }
    } catch (e) {
      // ignore packages where reading them causes an error
      continue;
    }
  }

  return res;
}
