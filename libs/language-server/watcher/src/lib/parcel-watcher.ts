import { lspLogger } from '@nx-console/language-server/utils';
import { importNxPackagePath } from '@nx-console/shared/npm';
import { platform } from 'os';

export class ParcelWatcher {
  private subscription: import('@parcel/watcher').AsyncSubscription | undefined;
  private stopped = false;
  constructor(private workspacePath: string, private callback: () => unknown) {
    this.initWatcher();
  }

  public stop() {
    this.subscription?.unsubscribe();
    this.stopped = true;
  }

  private async initWatcher() {
    const module = await import('@parcel/watcher');
    const watcher = module.default;

    lspLogger.log(this.workspacePath);
    this.subscription = await watcher.subscribe(
      this.workspacePath,
      (err, events) => {
        lspLogger.log(`File change event ${JSON.stringify(events)}`);
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
              e.path.endsWith('tsconfig.base.json')
          )
        ) {
          lspLogger.log('Project configuration changed');
          this.callback();
        }
      },
      await this.watcherOptions()
    );
    lspLogger.log('Parcel watcher initialized');
  }

  private async watcherOptions(): Promise<
    import('@parcel/watcher').Options | undefined
  > {
    const { getIgnoredGlobs } = await importNxPackagePath<
      typeof import('nx/src/utils/ignore')
    >(this.workspacePath, 'src/utils/ignore', lspLogger);
    const ingoredGlobs = getIgnoredGlobs(this.workspacePath).filter(
      (glob) => !glob.startsWith('!')
    );
    const options: import('@parcel/watcher').Options = {
      ignore: ingoredGlobs,
    };

    if (platform() === 'win32') {
      options.backend = 'windows';
    }

    return options;
  }
}
