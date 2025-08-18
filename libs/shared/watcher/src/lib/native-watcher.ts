import type { WatchEvent, Watcher } from 'nx/src/native';
import { importNxPackagePath } from '@nx-console/shared-npm';
import { normalize } from 'path';
import { match as minimatch } from 'minimatch';
import { Logger } from '@nx-console/shared-utils';

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
  private stopped = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChanges: Set<string> = new Set();

  constructor(
    private workspacePath: string,
    private callback: () => unknown,
    private logger: Logger,
  ) {
    this.initWatcher();
  }

  stop() {
    this.stopped = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.watcher?.stop();
  }

  private async initWatcher() {
    const native = await importNxPackagePath<typeof import('nx/src/native')>(
      this.workspacePath,
      'src/native/index.js',
      this.logger,
    );
    this.watcher = new native.Watcher(this.workspacePath);

    this.watcher.watch((err: string | null, events: WatchEvent[]) => {
      if (err) {
        this.logger.log('Error watching files: ' + err);
      } else {
        const relevantEvents = events.filter((e) => {
          const path = normalize(e.path);
          return (
            (path.endsWith('project.json') ||
              path.endsWith('package.json') ||
              path.endsWith('nx.json') ||
              path.endsWith('workspace.json') ||
              path.endsWith('tsconfig.base.json') ||
              NX_PLUGIN_PATTERNS_TO_WATCH.some((pattern) =>
                minimatch([path], pattern, { dot: true }),
              ) ||
              NativeWatcher.openDocuments.has(path)) &&
            !path.startsWith('node_modules') &&
            !path.startsWith(normalize('.nx/cache')) &&
            !path.startsWith(normalize('.yarn/cache')) &&
            !path.startsWith(normalize('.nx/workspace-data'))
          );
        });

        if (relevantEvents.length > 0) {
          if (this.stopped) {
            this.watcher?.stop();
            return;
          }
          this.handleFileChanges(relevantEvents);
        }
      }
    });
  }

  private handleFileChanges(events: WatchEvent[]) {
    const criticalFiles: string[] = [];
    const nonCriticalFiles: string[] = [];

    for (const event of events) {
      const path = normalize(event.path);
      const isCritical =
        path.endsWith('project.json') ||
        path.endsWith('package.json') ||
        path.endsWith('nx.json');

      if (isCritical) {
        criticalFiles.push(path);
      } else {
        nonCriticalFiles.push(path);
        this.pendingChanges.add(path);
      }
    }

    if (criticalFiles.length > 0) {
      this.logger.log(
        `Critical files changed (triggering immediately): ${criticalFiles.join(
          ', ',
        )}`,
      );
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.pendingChanges.clear();
      this.callback();
    } else if (nonCriticalFiles.length > 0) {
      this.logger.log(
        `Non-critical files changed (debouncing for 10s): ${nonCriticalFiles.join(
          ', ',
        )}`,
      );
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        if (this.pendingChanges.size > 0) {
          this.logger.log(
            `Debounce timer expired, triggering callback for: ${Array.from(
              this.pendingChanges,
            ).join(', ')}`,
          );
          this.pendingChanges.clear();
          this.callback();
        }
        this.debounceTimer = null;
      }, 10000);
    }
  }

  private static openDocuments: Set<string> = new Set();
  static onOpenDocument(uri: string) {
    this.openDocuments.add(normalize(uri));
  }
  static onCloseDocument(uri: string) {
    this.openDocuments.delete(normalize(uri));
  }
}
