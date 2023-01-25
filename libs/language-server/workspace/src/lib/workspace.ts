import {
  checkIsNxWorkspace,
  formatError,
  toWorkspaceFormat,
} from '@nx-console/shared/utils';

import { clearJsonCache, fileExists } from '@nx-console/shared/file-system';
import { Logger } from '@nx-console/shared/schema';
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
import { getNxWorkspaceConfig } from './get-nx-workspace-config';
import { NxWorkspace } from '@nx-console/shared/types';

const enum Status {
  not_started,
  in_progress,
  cached,
}

let cachedReplay = new ReplaySubject<NxWorkspace>();
let status: Status = Status.not_started;

function resetStatus(workspacePath: string) {
  status = Status.not_started;
  cachedReplay = new ReplaySubject<NxWorkspace>();
  // Clear out the workspace config path, needed for angular or older nx workspaces
  clearJsonCache('angular.json', workspacePath);
  clearJsonCache('workspace.json', workspacePath);
  clearJsonCache('nx.json', workspacePath);
}

export async function nxWorkspace(
  workspacePath: string,
  logger: Logger = {
    log(message) {
      console.log(message);
    },
  },
  reset?: boolean
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
        })
      ),
      cachedReplay
    )
  );
}

async function _workspace(
  workspacePath: string,
  logger: Logger
): Promise<NxWorkspace> {
  const isAngularWorkspace = await fileExists(
    join(workspacePath, 'angular.json')
  );
  const isNxWorkspace = await checkIsNxWorkspace(workspacePath);

  try {
    const config = await getNxWorkspaceConfig(
      workspacePath,
      isAngularWorkspace ? 'angularCli' : 'nx',
      isNxWorkspace,
      logger
    );

    const isLerna = await fileExists(join(workspacePath, 'lerna.json'));
    return {
      validWorkspaceJson: true,
      workspaceType: isAngularWorkspace ? 'ng' : 'nx',
      workspace: toWorkspaceFormat(config.workspaceConfiguration),
      daemonEnabled: config.daemonEnabled,
      isLerna,
      workspaceLayout: {
        appsDir:
          config.workspaceConfiguration.workspaceLayout?.appsDir ?? isLerna
            ? 'packages'
            : 'apps',
        libsDir:
          config.workspaceConfiguration.workspaceLayout?.libsDir ?? isLerna
            ? 'packages'
            : 'libs',
      },
      workspacePath,
    };
  } catch (e) {
    logger.log(formatError('Invalid workspace', e));

    // Default to nx workspace
    return {
      validWorkspaceJson: false,
      workspaceType: 'nx',
      workspace: {
        npmScope: '@nx-console',
        projects: {},
        version: 2,
      },
      workspacePath,
      isLerna: false,
      workspaceLayout: {
        appsDir: 'apps',
        libsDir: 'libs',
      },
    };
  }
}
