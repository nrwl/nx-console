import { lspLogger } from '@nx-console/language-server-utils';
import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';
import { PassiveDaemonWatcher } from '@nx-console/shared-watcher';

let _daemonWatcher: PassiveDaemonWatcher | undefined;

export async function cleanupAllWatchers(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  if (_daemonWatcher) {
    cleanupPromises.push(
      Promise.resolve(_daemonWatcher.dispose()).catch((e) => {
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
  const daemonClient = await getNxDaemonClient(workspacePath, lspLogger);

  if (!daemonClient.daemonClient.enabled()) {
    lspLogger.log('Daemon client is not enabled, file watching not available.');
    return async () => {
      lspLogger.log('unregistering empty watcher');
    };
  }
  _daemonWatcher = new PassiveDaemonWatcher(workspacePath, lspLogger);
  await _daemonWatcher.start();
  _daemonWatcher.listen(() => {
    callback();
  });
  return async () => {
    if (_daemonWatcher) {
      return _daemonWatcher.dispose();
    }
  };
}
