// import { getOutputChannel } from '@nx-console/utils';
import type * as NxFileUtils from 'nx/src/project-graph/file-utils';
import type * as NxProjectGraph from 'nx/src/project-graph/project-graph';
import type * as NxDaemonClient from 'nx/src/daemon/client/client';
import type * as NxOutput from 'nx/src/utils/output';
import { platform } from 'os';
import { join } from 'path';
import { findNxPackagePath } from '@nx-console/shared/npm';
import { Logger } from '@nx-console/shared/schema';

export async function getNxDaemonClient(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxDaemonClient> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'daemon', 'client', 'client.js')
  );
  return getNxPackage(importPath, logger);
}

export async function getNxOutput(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxOutput | undefined> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'output.js')
  );

  if (!importPath) {
    return;
  }

  return getNxPackage(importPath, logger);
}

export async function getNxProjectGraph(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxProjectGraph> {
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

  return getNxPackage(importPath, logger);
}

/**
 * Get the local installed version of @nx/workspace
 */
export async function getNxWorkspacePackageFileUtils(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxFileUtils> {
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

  return getNxPackage(importPath, logger);
}

async function getNxPackage<T>(
  importPath: string | undefined,
  logger: Logger
): Promise<T> {
  if (!importPath) {
    logger?.log(
      `Unable to load the ${importPath} dependency from the workspace. Please ensure that the proper dependencies are installed locally.`
    );
    throw 'local Nx dependency not found';
  }

  if (platform() === 'win32') {
    importPath = importPath.replace(/\\/g, '/');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const imported = require(importPath);

  logger?.log(`Using local Nx package at ${importPath}`);

  return imported;
}
