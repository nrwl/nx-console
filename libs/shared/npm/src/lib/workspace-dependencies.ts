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
import { packageDetails } from './package-details';
import { coerce, SemVer } from 'semver';
import { findNxPackagePath } from './find-nx-package-path';

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

  const nodeModulesPath = join(
    workspacePath,
    'node_modules',
    workspaceDependencyName
  );
  const standalonePath = join(
    workspacePath,
    '.nx',
    'installation',
    'node_modules',
    workspaceDependencyName
  );

  try {
    if (await directoryExists(nodeModulesPath)) {
      return nodeModulesPath;
    } else if (await directoryExists(standalonePath)) {
      return standalonePath;
    } else {
      return undefined;
    }
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
  if ((await nxVersion(workspacePath)).major < 13) {
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

// THIS IS HANDLED BY THE NXLS NOW
// KEEPING IT AROUND IN THE SHARED FOLDER FOR NG CLI COMPAT
// TODO: REMOVE

declare function __non_webpack_require__(importPath: string): any;

let nxWorkspacePackageJson: { version: string };
let loadedNxPackage = false;

const defaultSemver = new SemVer('0.0.0');

export async function nxVersion(workspacePath: string): Promise<SemVer> {
  if (!loadedNxPackage) {
    const packagePath = await findNxPackagePath(workspacePath, 'package.json');

    if (!packagePath) {
      return defaultSemver;
    }

    nxWorkspacePackageJson = __non_webpack_require__(packagePath);
    loadedNxPackage = true;
  }

  if (!nxWorkspacePackageJson) {
    return defaultSemver;
  }
  const nxVersion = coerce(nxWorkspacePackageJson.version);
  if (!nxVersion) {
    return defaultSemver;
  }

  return nxVersion;
}
