import { formatError } from '@nx-console/shared-utils';

import { fileExists } from '@nx-console/shared-file-system';
import { Logger } from '@nx-console/shared-utils';
import { NxWorkspace } from '@nx-console/shared-types';
import { join } from 'path';
import {
  firstValueFrom,
  from,
  iif,
  of,
  ReplaySubject,
  switchMap,
  tap,
} from 'rxjs';
import { getNxVersion } from './get-nx-version';
import { getNxWorkspaceConfig } from './get-nx-workspace-config';
import { getNxDaemonClient } from './get-nx-workspace-package';
import type { ProjectGraph } from 'nx/src/devkit-exports';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';
import { execSync } from 'child_process';

const enum Status {
  not_started,
  in_progress,
  cached,
}

let cachedReplay = new ReplaySubject<NxWorkspace>();
let status: Status = Status.not_started;

export function resetStatus(workspacePath: string) {
  status = Status.not_started;
  cachedReplay = new ReplaySubject<NxWorkspace>();
}

export async function nxWorkspace(
  workspacePath: string,
  logger: Logger,
  reset?: boolean,
  projectGraphAndSourceMaps?: {
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  } | null,
): Promise<NxWorkspace> {
  if (reset || projectGraphAndSourceMaps) {
    logger?.debug?.('nxWorkspace: Resetting workspace status...');
    resetStatus(workspacePath);
  }

  return firstValueFrom(
    iif(
      () => status === Status.not_started,
      of({}).pipe(
        tap(() => {
          status = Status.in_progress;
        }),
        switchMap(() =>
          from(_workspace(workspacePath, logger, projectGraphAndSourceMaps)),
        ),
        tap((workspace) => {
          cachedReplay.next(workspace);
          status = Status.cached;
        }),
      ),
      cachedReplay,
    ),
  );
}

async function _workspace(
  workspacePath: string,
  logger: Logger,
  projectGraphAndSourceMaps?: {
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  } | null,
): Promise<NxWorkspace> {
  try {
    logger?.debug?.('_workspace: Starting workspace fetch...');
    logger?.debug?.('_workspace: Getting daemon client module...');
    const daemonClientModule = await getNxDaemonClient(workspacePath, logger);
    logger?.debug?.(
      `_workspace: Daemon client module retrieved: ${!!daemonClientModule}`,
    );
    logger?.debug?.('_workspace: Getting Nx version...');
    const nxVersion = await getNxVersion(workspacePath);
    logger?.debug?.(`_workspace: Nx version retrieved: ${nxVersion.full}`);

    logger?.debug?.(
      `_workspace: Calling getNxWorkspaceConfig, projectGraphAndSourceMaps provided: ${!!projectGraphAndSourceMaps}`,
    );
    const {
      projectGraph,
      sourceMaps,
      nxJson,
      projectFileMap,
      errors,
      isPartial,
    } = await getNxWorkspaceConfig(
      workspacePath,
      nxVersion,
      logger,
      daemonClientModule,
      projectGraphAndSourceMaps,
    );
    logger?.debug?.(
      `_workspace: getNxWorkspaceConfig completed, projectGraph nodes: ${Object.keys(projectGraph?.nodes ?? {}).length}`,
    );

    const isLerna = await fileExists(join(workspacePath, 'lerna.json'));

    return {
      daemonEnabled: daemonClientModule?.isDaemonEnabled() ?? false,
      projectGraph: projectGraph ?? {
        nodes: {},
        dependencies: {},
      },
      sourceMaps,
      nxJson,
      projectFileMap,
      validWorkspaceJson: true,
      isPartial: isPartial,
      isLerna,
      isEncapsulatedNx: !!nxJson?.installation,
      workspaceLayout: {
        appsDir: nxJson.workspaceLayout?.appsDir,
        libsDir: nxJson.workspaceLayout?.libsDir,
      },
      errors,
      nxVersion,
      workspacePath,
    };
  } catch (e) {
    logger.log(formatError('Invalid workspace', e));

    // Default to nx workspace
    return {
      daemonEnabled: false,
      validWorkspaceJson: false,
      projectGraph: {
        nodes: {},
        dependencies: {},
      },
      sourceMaps: undefined,
      projectFileMap: undefined,
      nxJson: {},
      workspacePath,
      isEncapsulatedNx: false,
      nxVersion: {
        major: 0,
        minor: 0,
        full: '0.0.0',
      },
      isLerna: false,
      workspaceLayout: {
        appsDir: 'apps',
        libsDir: 'libs',
      },
    };
  }
}
