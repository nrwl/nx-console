import { lspLogger } from '@nx-console/language-server-utils';
import { gte, NxVersion } from '@nx-console/nx-version';
import {
  getNxDaemonClient,
  getNxVersion,
} from '@nx-console/shared-nx-workspace-info';
import { debounce } from '@nx-console/shared-utils';
import {
  DaemonWatcher,
  DaemonWatcherCallback,
  NativeWatcher,
  PassiveDaemonWatcher,
} from '@nx-console/shared-watcher';

let _passiveDaemonWatcher: PassiveDaemonWatcher | undefined;
let _nativeWatcher: NativeWatcher | undefined;
let _daemonWatcher: DaemonWatcher | undefined;

export async function cleanupAllWatchers(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  if (_passiveDaemonWatcher) {
    cleanupPromises.push(
      Promise.resolve(_passiveDaemonWatcher.dispose()).catch((e) => {
        lspLogger.log(
          'Error stopping daemon watcher during global cleanup: ' + e,
        );
      }),
    );
    _passiveDaemonWatcher = undefined;
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

  await Promise.all(cleanupPromises);
}

export async function languageServerWatcher(
  workspacePath: string,
  callback: DaemonWatcherCallback,
  watcherOperationalCallback?: (isOperational: boolean) => void,
): Promise<() => Promise<void>> {
  const nxVersion = await getNxVersion(workspacePath);
  if (!nxVersion || !gte(nxVersion, '16.4.0')) {
    lspLogger.log(
      'File watching is not supported for Nx versions below 16.4.0.',
    );
    watcherOperationalCallback?.(false);
    return async () => {
      lspLogger.log('unregistering empty watcher');
    };
  }

  if (gte(nxVersion, '22.0.0')) {
    return registerPassiveDaemonWatcher(
      workspacePath,
      callback,
      watcherOperationalCallback,
    );
  } else {
    // older versions don't have this granular watcher tracking so we just assume true
    watcherOperationalCallback?.(true);
    return registerOldWatcher(workspacePath, nxVersion, callback);
  }
}

async function registerPassiveDaemonWatcher(
  workspacePath: string,
  callback: DaemonWatcherCallback,
  watcherOperationalCallback?: (isOperational: boolean) => void,
): Promise<() => Promise<void>> {
  const daemonClient = await getNxDaemonClient(workspacePath, lspLogger);

  if (!daemonClient.daemonClient.enabled()) {
    lspLogger.log('Daemon client is not enabled, file watching not available.');
    return async () => {
      lspLogger.log('unregistering empty watcher');
    };
  }
  try {
    _passiveDaemonWatcher = new PassiveDaemonWatcher(
      workspacePath,
      lspLogger,
      watcherOperationalCallback,
    );
    await _passiveDaemonWatcher.start();
    _passiveDaemonWatcher.listen((error, projectGraphAndSourceMaps) => {
      callback(error, projectGraphAndSourceMaps);
    });
    return async () => {
      if (_passiveDaemonWatcher) {
        return _passiveDaemonWatcher.dispose();
      }
    };
  } catch (e) {
    lspLogger.log(
      'Error starting passive daemon watcher: ' + (e as Error).message,
    );
    return async () => {
      lspLogger.log('unregistering empty watcher');
    };
  }
}

async function registerOldWatcher(
  workspacePath: string,
  nxVersion: NxVersion,
  callback: () => void,
): Promise<() => Promise<void>> {
  const debouncedCallback = debounce(callback, 1000);

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
      nxVersion,
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
}
