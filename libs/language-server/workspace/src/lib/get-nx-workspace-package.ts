// import { getOutputChannel } from '@nx-console/utils';
import type * as NxFileUtils from 'nx/src/project-graph/file-utils';
import type * as NxProjectGraph from 'nx/src/project-graph/project-graph';
import type * as NxProjectGraphFileUtils from 'nx/src/project-graph/file-map-utils';
import type * as NxDaemonClient from 'nx/src/daemon/client/client';
import type * as NxDaemonCache from 'nx/src/daemon/cache';
import type * as NxOutput from 'nx/src/utils/output';
import { join } from 'path';
import {
  findNxPackagePath,
  importWorkspaceDependency,
} from '@nx-console/shared/npm';
import { Logger } from '@nx-console/shared/schema';

export async function getNxDaemonClient(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxDaemonClient | undefined> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'daemon', 'client', 'client.js')
  );
  if (!importPath) {
    return;
  }
  return importWorkspaceDependency(importPath, logger);
}

export async function getNxDaemonCache(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxDaemonCache> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'daemon', 'cache.js')
  );
  return importWorkspaceDependency(importPath, logger);
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

  return importWorkspaceDependency(importPath, logger);
}

export async function getNxProjectGraphUtils(
  workspacePath: string,
  logger: Logger
): Promise<typeof NxProjectGraphFileUtils | undefined> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'project-graph', 'file-map-utils.js')
  );

  if (!importPath) {
    return;
  }

  return importWorkspaceDependency(importPath, logger);
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

  return importWorkspaceDependency(importPath, logger);
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

  return importWorkspaceDependency(importPath, logger);
}
