import { workspaceDependencyPath } from '@nx-console/npm';
import { fileExists, getOutputChannel } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import * as NxFileUtils from 'nx/src/project-graph/file-utils';
import * as NxProjectGraph from 'nx/src/project-graph/project-graph';
import { platform } from 'os';
import { join } from 'path';

declare function __non_webpack_require__(importPath: string): any;

let RESOLVED_FILEUTILS_IMPORT: typeof NxFileUtils;
let RESOLVED_PROJECTGRAPH_IMPORT: typeof NxProjectGraph;

export async function getNxProjectGraph(): Promise<typeof NxProjectGraph> {
  if (RESOLVED_PROJECTGRAPH_IMPORT) {
    return RESOLVED_PROJECTGRAPH_IMPORT;
  }

  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );
  let importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'project-graph', 'project-graph.js')
  );

  if (!importPath) {
    importPath = await findNxPackagePath(
      workspacePath,
      join('src', 'core', 'project-graph', 'project-graph.js')
    );
  }

  return getNxPackage(importPath, NxProjectGraph, RESOLVED_PROJECTGRAPH_IMPORT);
}

/**
 * Get the local installed version of @nrwl/workspace
 */
export async function getNxWorkspacePackageFileUtils(): Promise<
  typeof NxFileUtils
> {
  if (RESOLVED_FILEUTILS_IMPORT) {
    return RESOLVED_FILEUTILS_IMPORT;
  }

  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  let importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'project-graph', 'file-utils.js')
  );

  if (!importPath) {
    importPath = await findNxPackagePath(
      workspacePath,
      join('src', 'core', 'file-utils.js')
    );
  }

  return getNxPackage(importPath, NxFileUtils, RESOLVED_FILEUTILS_IMPORT);
}

async function getNxPackage<T>(
  importPath: string | undefined,
  backupPackage: T,
  cache: T
): Promise<T> {
  try {
    if (!importPath) {
      throw 'local Nx dependency not found';
    }

    if (platform() === 'win32') {
      importPath = importPath.replace(/\\/g, '/');
    }

    const imported = __non_webpack_require__(importPath);

    getOutputChannel().appendLine(`Using local Nx package at ${importPath}`);

    cache = imported;
    return imported;
  } catch (error) {
    getOutputChannel().appendLine(
      `Unable to load the ${importPath} dependency from the workspace. Falling back to extension dependency
${error}
    `
    );
    cache = backupPackage;
    return backupPackage;
  }
}

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
