import { lspLogger } from '@nx-console/language-server-utils';
import { importNxPackagePath } from '@nx-console/shared-npm';
import { platform } from 'os';

export class ParcelWatcher {
  private subscription: import('@parcel/watcher').AsyncSubscription | undefined;
  private stopped = false;
  constructor(
    private workspacePath: string,
    private callback: () => unknown,
  ) {
    this.initWatcher();
  }

  public stop() {
    this.subscription?.unsubscribe();
    this.stopped = true;
  }

  private async initWatcher() {
    const module = await import('@parcel/watcher');
    const watcher = module.default;

    this.subscription = await watcher.subscribe(
      this.workspacePath,
      (err, events) => {
        if (this.stopped) {
          this.subscription?.unsubscribe();
          return;
        }
        if (err) {
          lspLogger.log('Error watching files: ' + err.toString());
        } else if (
          events.some(
            (e) =>
              e.path.endsWith('project.json') ||
              e.path.endsWith('package.json') ||
              e.path.endsWith('nx.json') ||
              e.path.endsWith('workspace.json') ||
              e.path.endsWith('tsconfig.base.json'),
          )
        ) {
          lspLogger.log(
            `Project configuration changed, ${events.map((e) => e.path)}`,
          );
          this.callback();
        }
      },
      await this.watcherOptions(),
    );
    lspLogger.log('Parcel watcher initialized');
  }

  private async watcherOptions(): Promise<
    import('@parcel/watcher').Options | undefined
  > {
    let ignoredGlobs: string[] = [];
    try {
      const { getIgnoredGlobs } = await importNxPackagePath<any>(
        this.workspacePath,
        'src/utils/ignore',
        lspLogger,
      );
      ignoredGlobs = getIgnoredGlobs(this.workspacePath).filter(
        (glob) => !glob.startsWith('!'),
      );
    } catch (e) {
      // do nothing as parcel is only used for Nx < 16.4.0, and this function was removed in Nx 21
    }

    const options: import('@parcel/watcher').Options = {
      ignore: ignoredGlobs,
    };

    if (platform() === 'win32') {
      options.backend = 'windows';
    }

    return options;
  }
}
