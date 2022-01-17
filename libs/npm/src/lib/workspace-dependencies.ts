import { npmDependencies } from './npm-dependencies';
import { isWorkspaceInPnp, pnpDependencies } from './pnp-dependencies';

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
