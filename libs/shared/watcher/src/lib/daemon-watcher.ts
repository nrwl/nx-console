import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import { NativeWatcher } from './native-watcher';
import { normalize } from 'path';
import type { ProjectGraphError } from 'nx/src/project-graph/error-types';
import { gte, NxVersion } from '@nx-console/nx-version';
import {
  canReadNxJson,
  getPackageManagerCommand,
} from '@nx-console/shared-npm';
import { Logger } from '@nx-console/shared-utils';
import { execSync } from 'child_process';

export class DaemonWatcher {
  private stopped = false;
  private retryCount = 0;

  private disposables: Set<() => void | Promise<void>> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChanges: Set<string> = new Set();

  constructor(
    private workspacePath: string,
    private nxVersion: NxVersion,
    private callback: () => unknown,
    private logger: Logger,
    private skipInitialProjectGraphComputation = false,
  ) {}

  async start() {
    await this.initWatcher();
  }

  async stop() {
    this.stopped = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.disposeEverything();
  }

  private async initWatcher() {
    this.disposeEverything();
    if (this.stopped) return;

    if (!(await canReadNxJson(this.workspacePath))) {
      this.logger.log('Unable to read nx.json, using native watcher');
      this.useNativeWatcher();
      return;
    }

    try {
      const daemonClientModule = await getNxDaemonClient(
        this.workspacePath,
        this.logger,
      );

      if (
        daemonClientModule &&
        daemonClientModule.daemonClient?.enabled() &&
        !(await daemonClientModule.daemonClient?.isServerAvailable())
      ) {
        const pm = await getPackageManagerCommand(
          this.workspacePath,
          this.logger,
        );
        execSync(`${pm.exec} nx daemon --start`, {
          cwd: this.workspacePath,
          windowsHide: true,
        });
      }

      if (!daemonClientModule?.daemonClient.enabled()) {
        daemonClientModule?.daemonClient.reset();
        this.logger.log('Daemon is disabled, using native watcher');
        this.useNativeWatcher();
        return;
      }

      this.logger.log(
        `Initializing daemon watcher ${
          this.retryCount > 0 ? `, retries ${this.retryCount}` : ''
        }`,
      );

      let projectGraphErrors = false;
      if (!this.skipInitialProjectGraphComputation) {
        try {
          if (gte(this.nxVersion, '17.2.0')) {
            await daemonClientModule?.daemonClient.getProjectGraphAndSourceMaps();
          } else {
            await (daemonClientModule?.daemonClient as any).getProjectGraph();
          }
        } catch (e) {
          this.logger.log(`caught error,${e}, ${JSON.stringify(e)}`);
          if (!isProjectGraphError(e)) {
            projectGraphErrors = true;
          }
        }
      } else {
        this.logger.log('Skipping initial project graph computation');
      }

      if (
        !daemonClientModule ||
        (!this.skipInitialProjectGraphComputation && projectGraphErrors)
      ) {
        this.logger.log(
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
                this.logger.log('Daemon watcher connection closed, restarting');
                await this.useNativeWatcher();
              }
            } else if (error) {
              this.logger.log('Error watching files: ' + error);
            } else {
              if (this.stopped) {
                this.logger.log('got file watcher event after being stopped');
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
                this.logger.log(
                  `filtered out files: ${data?.changedFiles
                    .map((f) => f.path)
                    .join(', ')}`,
                );
                return;
              }
              if (filteredChangedFiles.length) {
                this.logger.log(
                  'Files changed: ' +
                    filteredChangedFiles
                      .map((f) => `${f.path} (${f.type})`)
                      .join(', '),
                );
                this.handleFileChanges(filteredChangedFiles);
              }
            }
          },
        );

      this.logger.log('Initialized daemon watcher');

      this.disposables.add(unregister);
    } catch (e) {
      this.logger.log(
        `Error initializing daemon watcher, check daemon logs. ${e}`,
      );
      this.useNativeWatcher();
    }
  }

  private async useNativeWatcher() {
    await this.disposeEverything();

    const nativeWatcher = new NativeWatcher(
      this.workspacePath,
      () => {
        this.callback();
      },
      this.logger,
    );
    this.disposables.add(async () => {
      await nativeWatcher.stop();
    });
  }

  private handleFileChanges(
    changedFiles: Array<{ path: string; type: string }>,
  ) {
    const criticalFiles: string[] = [];
    const nonCriticalFiles: string[] = [];

    for (const file of changedFiles) {
      const normalized = normalize(file.path);
      const isCritical =
        normalized.endsWith('project.json') ||
        normalized.endsWith('package.json') ||
        normalized.endsWith('nx.json');

      if (isCritical) {
        criticalFiles.push(file.path);
      } else {
        nonCriticalFiles.push(file.path);
        this.pendingChanges.add(file.path);
      }
    }

    if (criticalFiles.length > 0) {
      this.logger.log(
        `Critical files changed (triggering immediately): ${criticalFiles.join(
          ', ',
        )}`,
      );
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.pendingChanges.clear();
      this.callback();
    } else if (nonCriticalFiles.length > 0) {
      this.logger.log(`Non-critical files changed (debouncing for 10s)`);
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        if (this.pendingChanges.size > 0) {
          this.logger.log(`Debounce timer expired, triggering callback`);
          this.pendingChanges.clear();
          this.callback();
        }
        this.debounceTimer = null;
      }, 10000);
    }
  }

  private async disposeEverything() {
    for (const dispose of this.disposables) {
      await dispose();
    }
    this.disposables.clear();
  }
}

function isProjectGraphError(e: any): e is ProjectGraphError {
  return e.name === 'ProjectGraphError';
}
