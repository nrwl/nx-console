import { lspLogger } from '@nx-console/language-server-utils';
import { getNxVersion } from '@nx-console/shared-nx-workspace-info';
import { debounce } from '@nx-console/shared-utils';
import { DaemonWatcher, NativeWatcher } from '@nx-console/shared-watcher';
import { ParcelWatcher } from './parcel-watcher';
import { gte } from '@nx-console/nx-version';

let _daemonWatcher: DaemonWatcher | undefined;
let _nativeWatcher: NativeWatcher | undefined;

export async function cleanupAllWatchers(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  if (_nativeWatcher) {
    cleanupPromises.push(
      _nativeWatcher.stop().catch((e) => {
        lspLogger.log(
          'Error stopping native watcher during global cleanup: ' + e,
        );
      }),
    );
    _nativeWatcher = undefined;
  }

  if (_daemonWatcher) {
    cleanupPromises.push(
      Promise.resolve(_daemonWatcher.stop()).catch((e) => {
        lspLogger.log(
          'Error stopping daemon watcher during global cleanup: ' + e,
        );
      }),
    );
    _daemonWatcher = undefined;
  }

  await Promise.all(cleanupPromises);
}

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown,
): Promise<() => Promise<void>> {
  const version = await getNxVersion(workspacePath);
  const debouncedCallback = debounce(callback, 1000);

  if (gte(version, '16.4.0')) {
    if (process.platform === 'win32') {
      if (_nativeWatcher) {
        try {
          await _nativeWatcher.stop();
        } catch (e) {
          lspLogger.log('Error stopping previous native watcher: ' + e);
        }
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
        try {
          await nativeWatcher.stop();
        } catch (e) {
          lspLogger.log('Error stopping native watcher during cleanup: ' + e);
        }
        if (_nativeWatcher === nativeWatcher) {
          _nativeWatcher = undefined;
        }
      };
    } else {
      if (_daemonWatcher) {
        try {
          _daemonWatcher.stop();
        } catch (e) {
          lspLogger.log('Error stopping previous daemon watcher: ' + e);
        }
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
        try {
          await daemonWatcher.stop();
        } catch (e) {
          lspLogger.log('Error stopping daemon watcher during cleanup: ' + e);
        }
        if (_daemonWatcher === daemonWatcher) {
          _daemonWatcher = undefined;
        }
      };
    }
  } else {
    lspLogger.log('Nx version <16.4.0, using @parcel/watcher');
    const parcelWatcher = new ParcelWatcher(workspacePath, debouncedCallback);
    return async () => {
      lspLogger.log('Unregistering file watcher');
      try {
        parcelWatcher.stop();
      } catch (e) {
        lspLogger.log('Error stopping parcel watcher during cleanup: ' + e);
      }
    };
  }
}
