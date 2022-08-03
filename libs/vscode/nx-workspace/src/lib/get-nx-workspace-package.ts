import { getOutputChannel } from '@nx-console/utils';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import type * as NxFileUtils from 'nx/src/project-graph/file-utils';
import type * as NxProjectGraph from 'nx/src/project-graph/project-graph';
import { platform } from 'os';
import { join } from 'path';
import { findNxPackagePath } from '@nx-console/package';

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

  const nxProjectGraph = await import('nx/src/project-graph/project-graph');
  return getNxPackage(importPath, nxProjectGraph, RESOLVED_PROJECTGRAPH_IMPORT);
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

  const nxFileUtils = await import('nx/src/project-graph/file-utils');
  return getNxPackage(importPath, nxFileUtils, RESOLVED_FILEUTILS_IMPORT);
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
