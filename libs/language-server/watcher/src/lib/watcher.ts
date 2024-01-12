import { lspLogger } from '@nx-console/language-server/utils';
import * as watcher from '@parcel/watcher';
import { platform } from 'os';
import { getIgnoredGlobs } from 'nx/src/utils/ignore';
import { getNxVersion } from '@nx-console/language-server/workspace';
import { gte } from 'semver';
import type { WatchEvent } from 'nx/src/native';
import { debounce } from '@nx-console/shared/utils';

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown
): Promise<() => void> {
  const version = await getNxVersion(workspacePath);

  if (gte(version.version, '16.4.0')) {
    const native = await import('nx/src/native');
    const watcher = new native.Watcher(workspacePath);
    watcher.watch((err: string | null, events: WatchEvent[]) => {
      if (err) {
        lspLogger.log('Error watching files: ' + err);
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
        debounce(callback, 500)();
      }
    });

    return () => {
      lspLogger.log('Unregistering file watcher');
      watcher.stop();
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
          debounce(callback, 500)();
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
