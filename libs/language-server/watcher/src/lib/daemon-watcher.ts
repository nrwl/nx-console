import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';
import { NativeWatcher } from './native-watcher';
import { normalize } from 'path';
import type { ProjectGraphError } from 'nx/src/project-graph/error-types';
import { gte, NxVersion } from '@nx-console/nx-version';
import { canReadNxJson } from '@nx-console/shared-utils';

export class DaemonWatcher {
  private stopped = false;
  private retryCount = 0;

  private disposables: Set<() => void> = new Set();

  constructor(
    private workspacePath: string,
    private nxVersion: NxVersion,
    private callback: () => unknown,
  ) {}

  async start() {
    await this.initWatcher();
  }

  stop() {
    this.stopped = true;
    this.disposeEverything();
  }

  private async initWatcher() {
    this.disposeEverything();
    if (this.stopped) return;

    if (!(await canReadNxJson(this.workspacePath))) {
      lspLogger.log('Unable to read nx.json, using native watcher');
      this.useNativeWatcher();
      return;
    }

    try {
      const daemonClientModule = await getNxDaemonClient(
        this.workspacePath,
        lspLogger,
      );

      if (!daemonClientModule?.daemonClient.enabled()) {
        lspLogger.log('Daemon is disabled, using native watcher');
        this.useNativeWatcher();
        return;
      }

      lspLogger.log(
        `Initializing daemon watcher ${
          this.retryCount > 0 ? `, retries ${this.retryCount}` : ''
        }`,
      );

      let projectGraphErrors = false;
      try {
        if (gte(this.nxVersion, '17.2.0')) {
          await daemonClientModule?.daemonClient.getProjectGraphAndSourceMaps();
        } else {
          await (daemonClientModule?.daemonClient as any).getProjectGraph();
        }
      } catch (e) {
        lspLogger.log(`caught error,${e}, ${JSON.stringify(e)}`);
        if (!isProjectGraphError(e)) {
          projectGraphErrors = true;
        }
      }

      if (!daemonClientModule || projectGraphErrors) {
        lspLogger.log(
          `project graph computation error during daemon watcher initialization, using native watcher.`,
        );
        this.retryCount = 0;
        this.useNativeWatcher();
        return;
      }

      const unregister =
        await daemonClientModule.daemonClient.registerFileWatcher(
          {
            watchProjects: 'all',
            includeGlobalWorkspaceFiles: true,
            includeDependentProjects: true,
            allowPartialGraph: true,
          } as {
            watchProjects: string[] | 'all';
            includeGlobalWorkspaceFiles?: boolean;
            includeDependentProjects?: boolean;
          },
          async (error, data) => {
            if (error === 'closed') {
              if (!this.stopped) {
                lspLogger.log('Daemon watcher connection closed, restarting');
                this.useNativeWatcher();
              }
            } else if (error) {
              lspLogger.log('Error watching files: ' + error);
            } else {
              if (this.stopped) {
                lspLogger.log('got file watcher event after being stopped');
                unregister();
                return;
              }
              this.retryCount = 0;
              const filteredChangedFiles =
                data?.changedFiles?.filter((f) => {
                  const normalized = normalize(f.path);
                  return !(
                    normalized.includes(normalize('.yarn/cache')) ||
                    normalized.includes(normalize('.nx/cache')) ||
                    normalized.includes(normalize('.nx/workspace-data'))
                  );
                }) ?? [];
              if (filteredChangedFiles.length === 0) {
                lspLogger.log(
                  `filtered out files: ${data?.changedFiles
                    .map((f) => f.path)
                    .join(', ')}`,
                );
                return;
              }
              if (filteredChangedFiles.length) {
                lspLogger.log(
                  'Files changed: ' +
                    filteredChangedFiles
                      .map((f) => `${f.path} (${f.type})`)
                      .join(', '),
                );
                this.callback();
              }
            }
          },
        );

      lspLogger.log('Initialized daemon watcher');

      this.disposables.add(unregister);
    } catch (e) {
      lspLogger.log(
        `Error initializing daemon watcher, check daemon logs. ${e}`,
      );
      this.useNativeWatcher();
    }
  }

  private useNativeWatcher() {
    this.disposeEverything();

    const nativeWatcher = new NativeWatcher(this.workspacePath, () => {
      this.callback();
    });
    this.disposables.add(() => {
      nativeWatcher.stop();
    });
  }

  private disposeEverything() {
    for (const dispose of this.disposables) {
      dispose();
    }
    this.disposables.clear();
  }
}

function isProjectGraphError(e: any): e is ProjectGraphError {
  return e.name === 'ProjectGraphError';
}
