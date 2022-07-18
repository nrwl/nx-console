/* istanbul ignore catch */
import { WorkspaceProjects } from '@nx-console/schema';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { stat } from 'fs/promises';
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
  workspacePath: string,
  projects?: WorkspaceProjects
): Promise<string[]> {
  const dependencies: string[] = [];

  dependencies.push(...(await localDependencies(workspacePath, projects)));

  if (await isWorkspaceInPnp(workspacePath)) {
    dependencies.push(...(await pnpDependencies(workspacePath)));
  }

  dependencies.push(...(await npmDependencies(workspacePath)));

  return dependencies;
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
    const directoryType = (await workspace.fs.stat(Uri.file(path))).type;
    return (directoryType & FileType.Directory) === FileType.Directory
      ? path
      : undefined;
  } catch {
    return;
  }
}

async function localDependencies(
  workspacePath: string,
  projects?: WorkspaceProjects
): Promise<string[]> {
  if (!projects) {
    return [];
  }

  const nxVersion = WorkspaceConfigurationStore.instance.get('nxVersion', null);

  if (nxVersion && nxVersion < 13) {
    return [];
  }

  const packages = Object.values(projects).map(
    (project) => `${workspacePath}/${project.root}/package.json`
  );

  const existingPackages: string[] = [];

  for (const pkg of packages) {
    try {
      const fileStat = await stat(pkg);
      if (fileStat.isFile()) {
        existingPackages.push(pkg.replace('/package.json', ''));
      }
    } catch {
      // noop
    }
  }

  return existingPackages;
}
