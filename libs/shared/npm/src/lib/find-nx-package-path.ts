import { fileExists } from '@nx-console/shared-file-system';
import { platform } from 'os';
import { join } from 'path';
import { isWorkspaceInPnp } from './pnp-dependencies';
import { workspaceDependencyPath } from './workspace-dependencies';
import { readNxJson } from './nx-json';

/**
 * Finds the local Nx package in the workspace.
 *
 * It will try to look for the `nx` package, with the specific file. If it does not exist, it will try to look for the `@nrwl/workspace` package, with the specific file
 * @param workspacePath
 * @returns
 */
export async function findNxPackagePath(
  workspacePath: string,
  filePath: string,
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
    '@nrwl/workspace',
  );
  if (nrwlWorkspaceDepPath) {
    const path = buildPath(nrwlWorkspaceDepPath);
    if (await fileExists(path)) {
      return path;
    }
  }
}

/**
 * Finds the nx executable binary in the workspace.
 *
 * It first checks for a standalone nx executable in the base path.
 * If that exists, it returns the absolute path.
 * If not, it checks if the project uses Yarn PnP and finds the nx package.
 * If not under PnP, it looks in node_modules/.bin
 *
 * @param workspacePath The path to the workspace
 * @returns The path to the nx executable binary, or undefined if not found
 */
export async function findNxExecutable(
  workspacePath: string,
): Promise<string | undefined> {
  const isWindows = platform() === 'win32';
  const nxExecutableName = isWindows ? 'nx.bat' : 'nx';
  const nxExecutablePath = join(workspacePath, nxExecutableName);

  if (await isDotNxInstallation(workspacePath)) {
    return nxExecutablePath;
  }

  const nxPackagePath = await workspaceDependencyPath(workspacePath, 'nx');
  if (nxPackagePath) {
    if (await isWorkspaceInPnp(workspacePath)) {
      const pnpNxPath = join(nxPackagePath, 'bin', 'nx.js');
      if (await fileExists(pnpNxPath)) {
        return pnpNxPath;
      }
    }
  }

  // Check in node_modules/.bin
  const binPath = join(workspacePath, 'node_modules', '.bin');
  const binNxPath = join(binPath, nxExecutableName);

  if (await fileExists(binNxPath)) {
    return binNxPath;
  }

  return undefined;
}

export async function isDotNxInstallation(
  workspacePath: string,
): Promise<boolean> {
  try {
    const nxJson = await readNxJson(workspacePath);
    if (!nxJson.installation) {
      return false;
    }

    const isWindows = platform() === 'win32';
    const nxExecutableName = isWindows ? 'nx.bat' : 'nx';
    const nxExecutablePath = join(workspacePath, nxExecutableName);

    return await fileExists(nxExecutablePath);
  } catch (e) {
    return false;
  }
}
