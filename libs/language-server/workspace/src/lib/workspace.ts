import { formatError, sortWorkspaceProjects } from '@nx-console/shared/utils';

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
import { getNxVersion } from './get-nx-version';
import { lspLogger } from '@nx-console/language-server/utils';

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
  // Clear out the workspace config path, needed for older nx workspaces
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
  try {
    const nxVersion = await getNxVersion(workspacePath);
    const config = await getNxWorkspaceConfig(workspacePath, nxVersion, logger);

    const isLerna = await fileExists(join(workspacePath, 'lerna.json'));

    return {
      validWorkspaceJson: true,
      workspace: sortWorkspaceProjects(config.workspaceConfiguration),
      daemonEnabled: config.daemonEnabled,
      isPartial: config.isPartial,
      isLerna,
      isEncapsulatedNx: !!config.workspaceConfiguration.installation,
      workspaceLayout: {
        appsDir: config.workspaceConfiguration.workspaceLayout?.appsDir,
        libsDir: config.workspaceConfiguration.workspaceLayout?.libsDir,
      },
      errors: config.errors,
      nxVersion,
      workspacePath,
    };
  } catch (e) {
    logger.log(formatError('Invalid workspace', e));

    // Default to nx workspace
    return {
      validWorkspaceJson: false,
      workspace: {
        projects: {},
        version: 2,
      },
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
