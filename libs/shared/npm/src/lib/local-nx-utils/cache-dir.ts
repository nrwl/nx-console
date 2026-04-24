import { join } from 'path';
import { findNxPackagePath } from '../find-nx-package-path';
import { importWorkspaceDependency } from '../workspace-dependencies';

export async function getCacheDir(workspacePath: string): Promise<string> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'cache-directory.js'),
  );
  if (!importPath) {
    throw 'local nx dependency not found';
  }
  const { cacheDir } =
    await importWorkspaceDependency<
      typeof import('nx/src/utils/cache-directory')
    >(importPath);
  return cacheDir;
}

export async function getWorkspaceDataDirectory(
  workspacePath: string,
): Promise<string> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'cache-directory.js'),
  );
  if (!importPath) {
    throw 'local nx dependency not found';
  }
  const { workspaceDataDirectory } =
    await importWorkspaceDependency<
      typeof import('nx/src/utils/cache-directory')
    >(importPath);
  return workspaceDataDirectory;
}
