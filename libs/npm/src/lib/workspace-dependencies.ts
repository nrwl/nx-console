import { npmDependencies } from './npm-dependencies';
import { isWorkspaceInPnp, pnpDependencies } from './pnp-dependencies';

/**
 * Get a flat list of all node_modules folders in the workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param nodeModulesDir
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
