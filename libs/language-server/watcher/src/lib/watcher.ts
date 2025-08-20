import { lspLogger } from '@nx-console/language-server-utils';
import { getNxVersion } from '@nx-console/shared-nx-workspace-info';
import { debounce } from '@nx-console/shared-utils';
import { DaemonWatcher, NativeWatcher } from '@nx-console/shared-watcher';
import { ParcelWatcher } from './parcel-watcher';
import { gte } from '@nx-console/nx-version';

let _daemonWatcher: DaemonWatcher | undefined;
let _nativeWatcher: NativeWatcher | undefined;

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown,
): Promise<() => Promise<void>> {
  const version = await getNxVersion(workspacePath);
  const debouncedCallback = debounce(callback, 1000);

  if (gte(version, '16.4.0')) {
    if (process.platform === 'win32') {
      if (_nativeWatcher) {
        await _nativeWatcher.stop();
        _nativeWatcher = undefined;
      }
      const nativeWatcher = new NativeWatcher(
        workspacePath,
        debouncedCallback,
        lspLogger,
      );
      _nativeWatcher = nativeWatcher;
      return async () => {
        lspLogger.log('Unregistering file watcher');
        await nativeWatcher.stop();
      };
    } else {
      if (_daemonWatcher) {
        _daemonWatcher.stop();
        _daemonWatcher = undefined;
      }
      const daemonWatcher = new DaemonWatcher(
        workspacePath,
        version,
        debouncedCallback,
        lspLogger,
      );
      _daemonWatcher = daemonWatcher;

      await daemonWatcher.start();
      return async () => {
        lspLogger.log('Unregistering file watcher');
        await daemonWatcher.stop();
      };
    }
  } else {
    lspLogger.log('Nx version <16.4.0, using @parcel/watcher');
    const parcelWatcher = new ParcelWatcher(workspacePath, debouncedCallback);
    return async () => {
      lspLogger.log('Unregistering file watcher');
      parcelWatcher.stop();
    };
  }
}
