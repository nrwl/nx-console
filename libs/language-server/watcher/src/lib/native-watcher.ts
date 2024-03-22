import { WatchEvent, Watcher } from 'nx/src/native';
import { lspLogger } from '@nx-console/language-server/utils';
import { normalize } from 'path';
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

export class NativeWatcher {
  private watcher: Watcher | undefined;

  constructor(private workspacePath: string, private callback: () => unknown) {
    this.initWatcher();
  }

  stop() {
    this.watcher?.stop();
  }

  private async initWatcher() {
    const native = await import('nx/src/native');
    this.watcher = new native.Watcher(this.workspacePath);

    this.watcher.watch((err: string | null, events: WatchEvent[]) => {
      if (err) {
        lspLogger.log('Error watching files: ' + err);
      } else if (
        events
          .map((e) => normalize(e.path))
          .some(
            (path) =>
              path.endsWith('project.json') ||
              path.endsWith('package.json') ||
              path.endsWith('nx.json') ||
              path.endsWith('workspace.json') ||
              path.endsWith('tsconfig.base.json') ||
              NX_PLUGIN_PATTERNS_TO_WATCH.some((pattern) =>
                minimatch([path], pattern, { dot: true })
              )
          )
      ) {
        lspLogger.log('native watcher detected project changes');
        this.callback();
      }
    });
  }
}
