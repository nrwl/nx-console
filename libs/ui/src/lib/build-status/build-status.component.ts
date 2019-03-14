import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  CommandStatus,
  OpenInBrowserService,
  ShowItemInFolderService
} from '@angular-console/utils';
import { SPEEDS } from './speed-constants';
import { Subject, BehaviorSubject, combineLatest, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material';
import { GROW_SHRINK_VERT } from '../animations/grow-shink';

interface Summary {
  parsed: number;
  gzipped: number;
}

interface Stats {
  chunks: any[];
  assets: any[];
  errors: string[];
  warnings: string[];
  modulesByChunkId: any;
  summary: {
    assets: Summary;
    modules: number;
    dependencies: number;
  };
}

export interface BuildStatus {
  buildStatus:
    | 'build_pending'
    | 'build_inprogress'
    | 'build_success'
    | 'build_failure';
  progress: number;
  date: string;
  time: string;
  chunks: { name: string; file: string; size: string; type: string }[];
  errors: string[];
  serverHost?: string;
  serverPort?: number;
  isForProduction: boolean;
  outputPath?: string;
  indexFile?: string;
  stats: Stats;
}

enum SizeGroup {
  Gzipped = 'gzipped',
  Parsed = 'parsed'
}

const GROUP_LABELS = {
  [SizeGroup.Gzipped]: 'Gzipped',
  [SizeGroup.Parsed]: 'Parsed'
};

const DISPLAY_ASSET_SPEEDS = ['4g', '3gf', '3gs'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-build-status',
  templateUrl: './build-status.component.html',
  styleUrls: ['./build-status.component.scss'],
  animations: [GROW_SHRINK_VERT]
})
export class BuildStatusComponent {
  @Input()
  commandStatus: CommandStatus;

  @Input()
  set status(s: BuildStatus) {
    this.allStatus$.next(s);
  }

  readonly sizeGroups = Object.values(SizeGroup);
  readonly displayAssetSpeeds = DISPLAY_ASSET_SPEEDS;

  // This status is set at a polling interval
  private readonly allStatus$: Subject<BuildStatus> = new ReplaySubject(1);

  // So we double-check that it indeed does have meaningful changes
  readonly status$ = this.allStatus$.pipe(
    distinctUntilChanged(
      (a, b) =>
        typeof a === typeof b &&
        a.buildStatus === b.buildStatus &&
        a.progress === b.progress &&
        a.date === b.date &&
        a.time === b.time
    )
  );
  readonly currentChunkId$: Subject<void | string> = new BehaviorSubject<
    void | string
  >(undefined);

  readonly errors$ = this.status$.pipe(
    map(status => {
      if (status) {
        const statsErrors = status.stats ? status.stats.errors : [];
        // If we don't see stats errors then return errors read from terminal output.
        const errorsFromTerminalOutput = status.errors;
        const errors =
          statsErrors.length > 0 ? statsErrors : errorsFromTerminalOutput;
        // Only show unique values
        return errors.filter((x, idx, ary) => ary.indexOf(x) === idx);
      } else {
        return null;
      }
    })
  );

  readonly warnings$ = this.status$.pipe(
    map(status => (status && status.stats ? status.stats.warnings : null))
  );

  readonly problemsAnimationState$ = combineLatest(
    this.errors$,
    this.warnings$
  ).pipe(
    map(([es, ws]) => {
      return (es && es.length > 0) || (ws && ws.length > 0)
        ? 'expand'
        : 'collapse';
    })
  );

  readonly summary$ = this.status$.pipe(
    map(status => (status && status.stats ? status.stats.summary : null))
  );

  readonly openableOutputPath$ = this.status$.pipe(
    map(status =>
      status.buildStatus === 'build_success' ? status.outputPath : null
    )
  );

  readonly dependencyPercentage$ = this.status$.pipe(
    map(status => {
      if (status && status.stats) {
        const { dependencies, modules } = status.stats.summary;
        return modules > 0 ? ((dependencies / modules) * 100).toFixed(1) : '0';
      } else {
        return '0';
      }
    })
  );

  readonly serverUrl$ = this.status$.pipe(
    map(status => {
      if (
        status.progress === 100 &&
        status &&
        status.serverHost &&
        status.serverPort
      ) {
        return `http://${status.serverHost}:${status.serverPort}`;
      } else {
        return '';
      }
    })
  );

  readonly buildStatusIcon$ = this.status$.pipe(
    map(status => {
      if (!status) {
        return 'build';
      } else if (status.buildStatus === 'build_success') {
        return 'check_circle';
      } else if (status.buildStatus === 'build_failure') {
        return status.stats ? 'check_circle' : 'error';
      } else {
        return 'build';
      }
    })
  );

  readonly buildStatusClass$ = this.status$.pipe(
    map(status => {
      if (!status) {
        return 'pending';
      } else if (status.buildStatus === 'build_success') {
        return 'success';
      } else if (status.buildStatus === 'build_failure') {
        return status.stats ? 'success' : 'failure';
      } else {
        return 'pending';
      }
    })
  );

  readonly buildStatus$ = combineLatest(this.status$, this.serverUrl$).pipe(
    map(([status, serverUrl]) => {
      if (!status) {
        return 'Idle';
      } else if (
        status.buildStatus === 'build_inprogress' ||
        status.buildStatus === 'build_pending'
      ) {
        return 'Running';
      } else {
        return serverUrl ? 'Started' : 'Done';
      }
    })
  );

  readonly chunks$ = this.status$.pipe(
    map(status => {
      if (status && status.stats && status.stats.chunks) {
        return status.stats.chunks;
      } else {
        return [];
      }
    }),
    tap(chunks => {
      const defaultChunk = chunks.find(x => /main/.test(x.name)) || chunks[0];
      if (defaultChunk) {
        this.currentChunkId$.next(defaultChunk.id);
      }
    })
  );

  readonly currentChunk$ = combineLatest(
    this.chunks$,
    this.currentChunkId$
  ).pipe(
    map(([chunks, id]) => {
      const c = chunks.find(x => x.id === id);
      if (c) {
        return {
          id: c.id,
          name: c.name,
          file: c.file,
          size: c.size
        };
      } else {
        return null;
      }
    })
  );

  readonly modulesForCurrentChunk$ = combineLatest(
    this.status$,
    this.currentChunkId$
  ).pipe(
    map(([status, currentChunkId]) => {
      if (!currentChunkId || !status) {
        return null;
      }
      return (
        status.stats &&
        status.stats.modulesByChunkId &&
        status.stats.modulesByChunkId[currentChunkId]
      );
    })
  );

  readonly viewingModules$ = this.modulesForCurrentChunk$.pipe(
    map(modules => {
      if (!modules) {
        return null;
      }
      return modules.map((m: any) => [m.file, m.size]);
    })
  );

  readonly analyzeAnimationState$ = this.viewingModules$.pipe(
    map(modules => (modules ? 'expand' : 'collapse'))
  );

  readonly detailedBuildStatus$ = this.status$.pipe(
    map(status => {
      if (!status) {
        return 'Not started';
      }
      switch (status.buildStatus) {
        case 'build_pending': {
          return 'Starting...';
        }
        case 'build_inprogress': {
          return `Building... (${status.progress}%)`;
        }
        case 'build_success': {
          return `Completed`;
        }
        case 'build_failure': {
          return status.stats ? 'Completed' : 'Failed';
        }
      }
    })
  );

  readonly networkSpeeds$ = this.summary$.pipe(
    map(summary => {
      if (summary) {
        const size = summary.assets.gzipped;
        const sizeInMB = size / 1000 / 1000;
        return Object.keys(SPEEDS).map(k => {
          const speed = SPEEDS[k];
          const rttInSeconds = speed.rtt / 1000;
          const speedInMBps = speed.mbps / 8;
          return {
            ...speed,
            key: k,
            downloadTime:
              sizeInMB > 0
                ? `${(sizeInMB / speedInMBps + rttInSeconds).toFixed(2)}s`
                : '–'
          };
        });
      } else {
        return null;
      }
    })
  );

  readonly displayAssets$ = this.status$.pipe(
    map(status => {
      if (status && status.stats) {
        const sorted = status.stats.assets.sort((a, b) => {
          const aSize = a.sizes.gzipped;
          const bSize = b.sizes.gzipped;
          if (aSize > bSize) {
            return -1;
          } else if (aSize < bSize) {
            return 1;
          } else {
            return 0;
          }
        });

        return sorted.map(asset => {
          const size = asset.sizes.gzipped;
          return {
            ...asset,
            sizes: asset.sizes,
            speeds: DISPLAY_ASSET_SPEEDS.map(key => {
              const speed = SPEEDS[key];
              const sizeInMB = size / 1000 / 1000;
              const rttInSeconds = speed.rtt / 1000;
              const speedInMBps = speed.mbps / 8;
              return {
                key,
                sizeGroup: 'Gzipped',
                downloadTime: sizeInMB
                  ? `${(sizeInMB / speedInMBps + rttInSeconds).toFixed(2)}s`
                  : '–'
              };
            })
          };
        });
      } else {
        return null;
      }
    })
  );

  constructor(
    private readonly openInBrowserService: OpenInBrowserService,
    private readonly showItemInFolderService: ShowItemInFolderService
  ) {}

  getSpeedLabel(key: string) {
    return SPEEDS[key] ? SPEEDS[key].label : '';
  }

  getSizeGroupLabel(s: SizeGroup) {
    return GROUP_LABELS[s];
  }

  trackByString(_: number, x: string) {
    return x;
  }

  trackById(_: number, x: { id: string }) {
    return x;
  }

  trackBySpeedKey(_: number, speed: any) {
    return speed.key;
  }

  trackByAsset(_: number, asset: any) {
    return asset.name;
  }

  onServerOpen(url: string) {
    this.openInBrowserService.openUrl(url);
  }

  showItemInFolder(item: string) {
    this.showItemInFolderService.showItem(item);
  }

  handleChunkFileSelection(event: MatSelectChange) {
    this.currentChunkId$.next(event.value);
  }
}
