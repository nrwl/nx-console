import { lspLogger } from '@nx-console/language-server/utils';
import { getNxVersion } from '@nx-console/language-server/workspace';
import { debounce } from '@nx-console/shared/utils';
import * as watcher from '@parcel/watcher';
import { getIgnoredGlobs } from 'nx/src/utils/ignore';
import { platform } from 'os';
import { gte } from 'semver';
import { DaemonWatcher } from './daemon-watcher';

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown
): Promise<() => void> {
  const version = await getNxVersion(workspacePath);
  const debouncedCallback = debounce(callback, 1000);

  if (gte(version.full, '16.4.0')) {
    const daemonWatcher = new DaemonWatcher(workspacePath, debouncedCallback);
    return () => {
      lspLogger.log('Unregistering file watcher');
      daemonWatcher.stop();
    };
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
      watcherOptions(workspacePath)
    );

    return () => {
      lspLogger.log('Unregistering file watcher');
      subscription.unsubscribe();
    };
  }
}

function watcherOptions(workspacePath: string): watcher.Options | undefined {
  const options: watcher.Options = {
    ignore: getIgnoredGlobs(workspacePath),
  };

  if (platform() === 'win32') {
    options.backend = 'windows';
  }

  return options;
}
