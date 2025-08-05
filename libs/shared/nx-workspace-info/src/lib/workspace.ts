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
): Promise<NxWorkspace> {
  if (reset) {
    resetStatus(workspacePath);
  }

  return firstValueFrom(
    iif(
      () => status === Status.not_started,
      of({}).pipe(
        tap(() => {
          status = Status.in_progress;
        }),
        switchMap(() => from(_workspace(workspacePath, logger))),
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
): Promise<NxWorkspace> {
  try {
    const nxVersion = await getNxVersion(workspacePath);
    const {
      projectGraph,
      sourceMaps,
      nxJson,
      projectFileMap,
      errors,
      isPartial,
    } = await getNxWorkspaceConfig(workspacePath, nxVersion, logger);

    const isLerna = await fileExists(join(workspacePath, 'lerna.json'));

    return {
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
