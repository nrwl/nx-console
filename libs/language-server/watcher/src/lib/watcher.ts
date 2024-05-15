import { lspLogger } from '@nx-console/language-server/utils';
import { getNxVersion } from '@nx-console/language-server/workspace';
import { debounce } from '@nx-console/shared/utils';
import { gte } from 'semver';
import { DaemonWatcher } from './daemon-watcher';
import { NativeWatcher } from './native-watcher';
import { ParcelWatcher } from './parcel-watcher';

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
    lspLogger.log('Nx version <16.4.0, using @parcel/watcher');
    const parcelWatcher = new ParcelWatcher(workspacePath, debouncedCallback);
    return () => {
      lspLogger.log('Unregistering file watcher');
      parcelWatcher.stop();
    };
  }
}
