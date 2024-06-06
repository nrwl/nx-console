import { join } from 'path';
import { directoryExists, readDirectory } from '@nx-console/shared/file-system';

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

  if (!(await directoryExists(nodeModules))) {
    if (!(await directoryExists(nodeModulesEncapsulated))) {
      return res;
    } else {
      nodeModulesDir = nodeModulesEncapsulated;
    }
  }

  const dirContents = await readDirectory(nodeModulesDir);

  for (const npmPackageOrScope of dirContents) {
    if (npmPackageOrScope.startsWith('.')) {
      continue;
    }

    if (!(await directoryExists(join(nodeModulesDir, npmPackageOrScope)))) {
      continue;
    }

    if (npmPackageOrScope.startsWith('@')) {
      (await readDirectory(join(nodeModulesDir, npmPackageOrScope))).forEach(
        (p) => {
          res.push(join(nodeModulesDir, npmPackageOrScope, p));
        }
      );
    } else {
      res.push(join(nodeModulesDir, npmPackageOrScope));
    }
  }

  return res;
}
