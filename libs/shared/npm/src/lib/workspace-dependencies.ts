import { directoryExists, fileExists } from '@nx-console/shared/file-system';
import type { Logger, WorkspaceProjects } from '@nx-console/shared/schema';
import { NxVersion } from '@nx-console/shared/types';
import { stat } from 'fs/promises';
import { join } from 'path';
import { npmDependencies } from './npm-dependencies';
import { packageDetails } from './package-details';
import {
  isWorkspaceInPnp,
  pnpDependencies,
  pnpDependencyPath,
} from './pnp-dependencies';
import { platform } from 'os';

/**
 * Get dependencies for the current workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 */

export async function workspaceDependencies(
  workspacePath: string,
  nxVersion: NxVersion,
  projects?: WorkspaceProjects
): Promise<string[]> {
  const dependencies: string[] = [];

  dependencies.push(
    ...(await localDependencies(workspacePath, nxVersion, projects))
  );

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

  const nodeModulesPath = join(
    workspacePath,
    'node_modules',
    workspaceDependencyName
  );
  const encapsulatedPath = join(
    workspacePath,
    '.nx',
    'installation',
    'node_modules',
    workspaceDependencyName
  );

  try {
    if (await directoryExists(nodeModulesPath)) {
      return nodeModulesPath;
    } else if (await directoryExists(encapsulatedPath)) {
      return encapsulatedPath;
    } else {
      return undefined;
    }
  } catch {
    return;
  }
}

export function importWorkspaceDependency<T>(
  importPath: string,
  logger: Logger = {
    log(message) {
      console.log(message);
    },
  }
): Promise<T> {
  if (platform() === 'win32') {
    importPath = importPath.replace(/\\/g, '/');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const imported = require(importPath);

  logger?.log(`Using local Nx package at ${importPath}`);

  return imported;
}

export async function importNxPackagePath<T>(
  workspacePath: string,
  nestedPath: string,
  logger: Logger = {
    log(message) {
      console.log(message);
    },
  }
): Promise<T> {
  const nxWorkspaceDepPath = await workspaceDependencyPath(workspacePath, 'nx');

  if (!nxWorkspaceDepPath) {
    logger?.log(
      `Unable to load the "nx" package from the workspace. Please ensure that the proper dependencies are installed locally.`
    );
    throw 'local Nx dependency not found';
  }

  return importWorkspaceDependency(
    join(nxWorkspaceDepPath, nestedPath),
    logger
  );
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
  version: NxVersion,
  projects?: WorkspaceProjects
): Promise<string[]> {
  if (!projects) {
    return [];
  }

  // Local plugins do not work with nxVersion less than 13
  if (version.major < 13) {
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
