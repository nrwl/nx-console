import { join } from 'path';
import { FileType, Uri, workspace } from 'vscode';
import { npmDependencies } from './npm-dependencies';
import {
  isWorkspaceInPnp,
  pnpDependencies,
  pnpDependencyPath,
} from './pnp-dependencies';

/**
 * Get dependencies for the current workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param workspacePath
 * @returns
 */

export async function workspaceDependencies(
  workspacePath: string
): Promise<string[]> {
  if (await isWorkspaceInPnp(workspacePath)) {
    return pnpDependencies(workspacePath);
  }

  return npmDependencies(workspacePath);
}

export async function workspaceDependencyPath(
  workspacePath: string,
  workspaceDependencyName: string
) {
  if (workspaceDependencyName.startsWith('.')) {
    return join(workspacePath, workspaceDependencyName);
  }

  if (await isWorkspaceInPnp(workspacePath)) {
    return pnpDependencyPath(workspacePath, workspaceDependencyName);
  }

  const path = join(workspacePath, 'node_modules', workspaceDependencyName);
  try {
    const fileType = (await workspace.fs.stat(Uri.file(path))).type;
    return (fileType & FileType.Directory) === FileType.Directory
      ? path
      : undefined;
  } catch {
    return;
  }
}
