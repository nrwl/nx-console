import { checkIsNxWorkspace, toWorkspaceFormat } from '@nx-console/utils';

import { clearJsonCache, fileExists } from '@nx-console/file-system';
import { Logger } from '@nx-console/schema';
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
import {
  getNxWorkspaceConfig,
  NxWorkspaceConfiguration,
} from './get-nx-workspace-config';

interface NxWorkspace {
  validWorkspaceJson: boolean;
  workspace: NxWorkspaceConfiguration;
  workspaceType: 'ng' | 'nx';
  configurationFilePath: string;
  workspacePath: string;
  isLerna: boolean;
  workspaceLayout: {
    appsDir: string;
    libsDir: string;
  };
}

const enum Status {
  not_started,
  in_progress,
  cached,
}

let cachedReplay = new ReplaySubject<NxWorkspace>();
let status: Status = Status.not_started;

export async function nxWorkspace(
  workspacePath: string,
  logger: Logger = {
    appendLine(message) {
      console.log(message);
    },
  },
  reset?: boolean
): Promise<NxWorkspace> {
  if (reset) {
    status = Status.not_started;
    cachedReplay = new ReplaySubject<NxWorkspace>();
    // Clear out the workspace config path, needed for angular or older nx workspaces
    clearJsonCache('angular.json', workspacePath);
    clearJsonCache('workspace.json', workspacePath);
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
  const config = await getNxWorkspaceConfig(
    workspacePath,
    isAngularWorkspace ? 'angularCli' : 'nx',
    isNxWorkspace,
    logger
  );

  const isLerna = await fileExists(join(workspacePath, 'lerna.json'));

  try {
    return {
      validWorkspaceJson: true,
      workspaceType: isAngularWorkspace ? 'ng' : 'nx',
      workspace: toWorkspaceFormat(config.workspaceConfiguration),
      configurationFilePath: config.configPath,
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
    const humanReadableError = 'Invalid workspace: ' + workspacePath;
    logger?.appendLine(humanReadableError);
    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    logger?.appendLine(stringifiedError);

    // Default to nx workspace
    return {
      validWorkspaceJson: false,
      workspaceType: 'nx',
      workspace: {
        npmScope: '@nx-console',
        projects: {},
        version: 2,
      },
      configurationFilePath: '',
      workspacePath,
      isLerna: false,
      workspaceLayout: {
        appsDir: 'apps',
        libsDir: 'libs',
      },
    };
  }
}
