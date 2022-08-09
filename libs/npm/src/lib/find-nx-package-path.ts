import { join } from 'path';
import { fileExists } from '@nx-console/file-system';
import { workspaceDependencyPath } from './workspace-dependencies';

/**
 * Finds the local Nx package in the workspace.
 *
 * It will try to look for the `nx` package, with the specific file. If it does not exist, it will try to look for the `@nrwl/workspace` package, with the specific file
 * @param workspacePath
 * @returns
 */
export async function findNxPackagePath(
  workspacePath: string,
  filePath: string
): Promise<string | undefined> {
  const buildPath = (base: string) => join(base, filePath);

  const nxWorkspaceDepPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (nxWorkspaceDepPath) {
    const path = buildPath(nxWorkspaceDepPath);
    if (await fileExists(path)) {
      return path;
    }
  }

  const nrwlWorkspaceDepPath = await workspaceDependencyPath(
    workspacePath,
    '@nrwl/workspace'
  );
  if (nrwlWorkspaceDepPath) {
    const path = buildPath(nrwlWorkspaceDepPath);
    if (await fileExists(path)) {
      return path;
    }
  }
}
