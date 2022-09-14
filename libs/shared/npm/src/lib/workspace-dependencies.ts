import { WorkspaceProjects } from '@nx-console/shared/schema';
import { stat } from 'fs/promises';
import { join } from 'path';
import { npmDependencies } from './npm-dependencies';
import {
  isWorkspaceInPnp,
  pnpDependencies,
  pnpDependencyPath,
} from './pnp-dependencies';
import { directoryExists } from '@nx-console/shared/file-system';
import { nxVersion } from './nx-version';
import { packageDetails } from './package-details';

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
    return (await directoryExists(path)) ? path : undefined;
  } catch {
    return;
  }
}

export async function localDependencyPath(
  workspacePath: string,
  workspaceDependencyName: string,
  projects: WorkspaceProjects
): Promise<string | undefined> {
  for (const project of Object.values(projects)) {
    const projectPath = join(workspacePath, project.root);
    const pkgDetails = await packageDetails(projectPath);
    if (pkgDetails.packageName === workspaceDependencyName) {
      return pkgDetails.packagePath;
    }
  }
}

async function localDependencies(
  workspacePath: string,
  projects?: WorkspaceProjects
): Promise<string[]> {
  if (!projects) {
    return [];
  }

  // Local plugins do not work with nxVersion less than 13
  if ((await nxVersion(workspacePath)) < 13) {
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
