import { join } from 'path';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '../workspace-dependencies';

export async function getCacheDir(workspacePath: string): Promise<string> {
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath) {
    throw 'local nx dependency not found';
  }
  const importPath = join(nxPath, 'src/utils/cache-directory');
  const { cacheDir } =
    await importWorkspaceDependency<
      typeof import('nx/src/utils/cache-directory')
    >(importPath);
  return cacheDir;
}

export async function getWorkspaceDataDirectory(
  workspacePath: string,
): Promise<string> {
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath) {
    throw 'local nx dependency not found';
  }
  const importPath = join(nxPath, 'src/utils/cache-directory');
  const { workspaceDataDirectory } =
    await importWorkspaceDependency<
      typeof import('nx/src/utils/cache-directory')
    >(importPath);
  return workspaceDataDirectory;
}
