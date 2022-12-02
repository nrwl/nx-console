import { lspLogger } from '@nx-console/language-server/utils';
import * as watcher from '@parcel/watcher';
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
        callback();
      }
    },
    {
      ignore: [join(workspacePath, 'node_modules')],
    }
  );

  return () => {
    lspLogger.log('Unregistering file watcher');
    subscription.unsubscribe();
  };
}
