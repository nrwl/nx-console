import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';
import * as NxFileUtils from '@nrwl/workspace/src/core/file-utils';
import { fileExists, getOutputChannel } from '@nx-console/server';
import { platform } from 'os';
import { workspaceDependencyPath } from '@nx-console/npm';

declare function __non_webpack_require__(importPath: string): any;

let RESOLVED_IMPORT: typeof NxFileUtils;

/**
 * Get the local installed version of @nrwl/workspace
 */
export async function getNxWorkspacePackageFileUtils(): Promise<
  typeof NxFileUtils
> {
  if (RESOLVED_IMPORT) {
    return RESOLVED_IMPORT;
  }

  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  let importPath = await findNxPackage(workspacePath);

  try {
    if (!importPath) {
      throw 'local Nx dependency not found';
    }

    if (platform() === 'win32') {
      importPath = importPath.replace(/\\/g, '/');
    }

    const imported = __non_webpack_require__(importPath);

    if (!('readWorkspaceConfig' in imported)) {
      throw new Error(
        'Workspace tools does not have `readWorkspaceConfig` function'
      );
    }

    getOutputChannel().appendLine(`Using local Nx package at ${importPath}`);

    RESOLVED_IMPORT = imported;
    return imported;
  } catch (error) {
    getOutputChannel().appendLine(
      `Error loading Nx from the workspace. Falling back to extension dependency
${error}
    `
    );
    RESOLVED_IMPORT = NxFileUtils;
    return NxFileUtils;
  }
}

/**
 * Finds the local Nx package in the workspace.
 *
 * It will try to look for the `nx` package, with the specific file `src/core/file-utils.js`. If it does not exist, it will try to look for the `@nrwl/workspace` package, with the specific file `src/core/file-utils.js`
 * @param workspacePath
 * @returns
 */
async function findNxPackage(
  workspacePath: string
): Promise<string | undefined> {
  const buildPath = (base: string) =>
    join(base, 'src', 'core', 'file-utils.js');

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
