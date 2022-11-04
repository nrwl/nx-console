// import { getOutputChannel } from '@nx-console/utils';
import type * as NxFileUtils from 'nx/src/project-graph/file-utils';
import type * as NxProjectGraph from 'nx/src/project-graph/project-graph';
import type * as NxDaemonClient from 'nx/src/daemon/client/client';
import { platform } from 'os';
import { join } from 'path';
import { findNxPackagePath } from '@nx-console/shared/npm';
import { Logger } from '@nx-console/shared/schema';

declare function __non_webpack_require__(importPath: string): any;

let RESOLVED_FILEUTILS_IMPORT: typeof NxFileUtils;
let RESOLVED_PROJECTGRAPH_IMPORT: typeof NxProjectGraph;
let RESOLVED_DAEMON_CLIENT: typeof NxDaemonClient;

export async function getNxDaemonClient(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxDaemonClient> {
  if (RESOLVED_DAEMON_CLIENT) {
    return RESOLVED_DAEMON_CLIENT;
  }

  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'daemon', 'client', 'client.js')
  );
  const backupPackage = await import('nx/src/daemon/client/client');
  return getNxPackage(
    importPath,
    backupPackage,
    RESOLVED_DAEMON_CLIENT,
    logger
  );
}

export async function getNxProjectGraph(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxProjectGraph> {
  if (RESOLVED_PROJECTGRAPH_IMPORT) {
    return RESOLVED_PROJECTGRAPH_IMPORT;
  }

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
  return getNxPackage(
    importPath,
    nxProjectGraph,
    RESOLVED_PROJECTGRAPH_IMPORT,
    logger
  );
}

/**
 * Get the local installed version of @nrwl/workspace
 */
export async function getNxWorkspacePackageFileUtils(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxFileUtils> {
  if (RESOLVED_FILEUTILS_IMPORT) {
    return RESOLVED_FILEUTILS_IMPORT;
  }

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
  return getNxPackage(
    importPath,
    nxFileUtils,
    RESOLVED_FILEUTILS_IMPORT,
    logger
  );
}

async function getNxPackage<T>(
  importPath: string | undefined,
  backupPackage: T,
  cache: T,
  logger: Logger
): Promise<T> {
  try {
    if (!importPath) {
      throw 'local Nx dependency not found';
    }

    if (platform() === 'win32') {
      importPath = importPath.replace(/\\/g, '/');
    }

    const imported = __non_webpack_require__(importPath);

    logger?.log(`Using local Nx package at ${importPath}`);

    cache = imported;
    return imported;
  } catch (error) {
    logger?.log(
      `Unable to load the ${importPath} dependency from the workspace. Falling back to extension dependency
${error}
    `
    );
    cache = backupPackage;
    return backupPackage;
  }
}
