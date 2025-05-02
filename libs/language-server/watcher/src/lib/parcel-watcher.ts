import { lspLogger } from '@nx-console/language-server-utils';
import { importNxPackagePath } from '@nx-console/shared-npm';
import { platform } from 'os';
import { join } from 'path';

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
    const { readFileIfExisting } = await importNxPackagePath<
      typeof import('nx/src/utils/fileutils')
    >(this.workspacePath, 'src/utils/fileutils', lspLogger);
    const nxIgnore = readFileIfExisting(join(this.workspacePath, '.nxignore'));
    const gitIgnore = readFileIfExisting(
      join(this.workspacePath, '.gitignore'),
    );
    const ingoredGlobs = [...nxIgnore, ...gitIgnore].filter(
      (glob) => !glob.startsWith('!'),
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
