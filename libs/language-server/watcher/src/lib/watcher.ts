import { lspLogger } from '@nx-console/language-server/utils';
import { getNxVersion } from '@nx-console/language-server/workspace';
import { debounce } from '@nx-console/shared/utils';
import * as watcher from '@parcel/watcher';
import { platform } from 'os';
import { gte } from 'semver';
import { DaemonWatcher } from './daemon-watcher';
import { NativeWatcher } from './native-watcher';
import { importNxPackagePath } from '@nx-console/shared/npm';

let _daemonWatcher: DaemonWatcher | undefined;
let _nativeWatcher: NativeWatcher | undefined;

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown
): Promise<() => void> {
  const version = await getNxVersion(workspacePath);
  const debouncedCallback = debounce(callback, 1000);

  if (gte(version.full, '16.4.0')) {
    if (process.platform === 'win32') {
      if (_nativeWatcher) {
        _nativeWatcher.stop();
        _nativeWatcher = undefined;
      }
      const nativeWatcher = new NativeWatcher(workspacePath, debouncedCallback);
      _nativeWatcher = nativeWatcher;
      return () => {
        lspLogger.log('Unregistering file watcher');
        nativeWatcher.stop();
      };
    } else {
      if (_daemonWatcher) {
        _daemonWatcher.stop();
        _daemonWatcher = undefined;
      }
      const daemonWatcher = new DaemonWatcher(workspacePath, debouncedCallback);
      _daemonWatcher = daemonWatcher;

      await daemonWatcher.start();
      return () => {
        lspLogger.log('Unregistering file watcher');
        daemonWatcher.stop();
      };
    }
  } else {
    const subscription = await watcher.subscribe(
      workspacePath,
      (err, events) => {
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
          debouncedCallback();
        }
      },
      await watcherOptions(workspacePath)
    );

    return () => {
      lspLogger.log('Unregistering file watcher');
      subscription.unsubscribe();
    };
  }
}

async function watcherOptions(
  workspacePath: string
): Promise<watcher.Options | undefined> {
  const { getIgnoredGlobs } = await importNxPackagePath<
    typeof import('nx/src/utils/ignore')
  >(workspacePath, 'src/utils/ignore', lspLogger);
  const options: watcher.Options = {
    ignore: getIgnoredGlobs(workspacePath),
  };

  if (platform() === 'win32') {
    options.backend = 'windows';
  }

  return options;
}
