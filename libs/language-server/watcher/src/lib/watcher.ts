import { lspLogger } from '@nx-console/language-server/utils';
import * as watcher from '@parcel/watcher';
import { platform } from 'os';
import { getIgnoredGlobs } from 'nx/src/utils/ignore';
import { getNxVersion } from '@nx-console/language-server/workspace';
import { gte } from 'semver';
import type { WatchEvent } from 'nx/src/native';
import { debounce } from '@nx-console/shared/utils';
import { match as minimatch } from 'minimatch';

const NX_PLUGIN_PATTERNS_TO_WATCH = [
  '**/cypress.config.{js,ts,mjs,cjs}',
  '**/{detox.config,.detoxrc}.{json,js}',
  '**/app.{json,config.js}',
  '**/jest.config.{cjs,mjs,js,cts,mts,ts}',
  '**/next.config.{js,cjs,mjs}',
  '**/nuxt.config.{js,ts,mjs,mts,cjs,cts}',
  '**/playwright.config.{js,ts,cjs,cts,mjs,mts}',
  '**/remix.config.{js,cjs,mjs}',
  '**/.storybook/main.{js,ts,mjs,mts,cjs,cts}',
  '**/{vite,vitest}.config.{js,ts,mjs,mts,cjs,cts}',
  '**/webpack.config.{js,ts,mjs,cjs}',
  '**/jest.preset.js',
  '**/tsconfig.*.json',
  // nx-dotnet
  '*{.csproj,fsproj,vbproj}',
];

export async function languageServerWatcher(
  workspacePath: string,
  callback: () => unknown
): Promise<() => void> {
  const version = await getNxVersion(workspacePath);
  const debouncedCallback = debounce(callback, 1000);

  if (gte(version.full, '16.4.0')) {
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
            e.path.endsWith('tsconfig.base.json') ||
            NX_PLUGIN_PATTERNS_TO_WATCH.some((pattern) =>
              minimatch([e.path], pattern, { dot: true })
            )
        )
      ) {
        lspLogger.log('Project configuration changed');
        debouncedCallback();
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
