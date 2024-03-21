import { getNxDaemonClient } from '@nx-console/language-server/workspace';
import { lspLogger } from '@nx-console/language-server/utils';
import { NativeWatcher } from './native-watcher';

export class DaemonWatcher {
  private stopped = false;
  private retryCount = 0;

  private disposables: Set<() => void> = new Set();

  constructor(private workspacePath: string, private callback: () => unknown) {
    this.initWatcher();
  }

  stop() {
    this.stopped = true;
    this.disposeEverything();
  }

  private async initWatcher() {
    this.disposeEverything();
    try {
      const daemonClientModule = await getNxDaemonClient(
        this.workspacePath,
        lspLogger
      );

      lspLogger.log('Initializing daemon watcher');

      const unregister =
        await daemonClientModule.daemonClient.registerFileWatcher(
          {
            watchProjects: 'all',
            includeGlobalWorkspaceFiles: true,
            includeDependentProjects: true,
          },
          (error, data) => {
            if (error === 'closed') {
              if (!this.stopped) {
                lspLogger.log('Daemon watcher connection closed, restarting');
                this.tryRestartWatcher();
              } else {
                lspLogger.log('Daemon watcher connection closed');
              }
            } else if (error) {
              lspLogger.log('Error watching files: ' + error);
            } else {
              this.retryCount = 0;
              if (data?.changedFiles?.length) {
                lspLogger.log(
                  'Files changed: ' +
                    data.changedFiles
                      .map((f) => [f.type, f.path].toString())
                      .join(' ')
                );
              }
              if (data?.changedProjects?.length) {
                lspLogger.log(
                  'Project configuration changed: ' +
                    data.changedProjects.join(', ')
                );
                this.callback();
              }
            }
          }
        );

      this.retryCount = 0;

      this.disposables.add(unregister);
    } catch (e) {
      lspLogger.log('Error initializing daemon watcher, check daemon logs.');
      this.tryRestartWatcher();
    }
  }

  private async tryRestartWatcher() {
    this.disposeEverything();
    if (this.retryCount > 3) {
      lspLogger.log(
        'Daemon watcher failed to restart after 3 attempts, using native watcher'
      );
      this.useNativeWatcher();
      return;
    }
    this.retryCount++;
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 1000 * this.retryCount);
      this.disposables.add(() => clearTimeout(timeout));
    });

    await this.initWatcher();
  }

  private useNativeWatcher() {
    this.disposeEverything();

    const nativeWatcher = new NativeWatcher(this.workspacePath, () =>
      this.callback()
    );
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
