import { lspLogger } from '@nx-console/language-server/utils';
import * as watcher from '@parcel/watcher';
import { platform } from 'os';
import { join } from 'path';

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown
): Promise<() => void> {
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
            e.path.endsWith('workspace.json')
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

function watcherOptions(workspacePath: string): watcher.Options | undefined {
  const options: watcher.Options = {
    ignore: [join(workspacePath, 'node_modules')],
  };

  if (platform() === 'win32') {
    options.backend = 'windows';
  }

  return options;
}

function debounce(callback: () => any, wait: number) {
  let timerId: NodeJS.Timeout;
  return () => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      callback();
    }, wait);
  };
}
