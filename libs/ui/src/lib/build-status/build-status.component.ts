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
    modules: Summary;
    dependencies: Summary;
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

  readonly currentSizeGroup$: Subject<SizeGroup> = new BehaviorSubject(
    SizeGroup.Gzipped
  );

  readonly currentChunkId$: Subject<void | string> = new BehaviorSubject<
    void | string
  >(undefined);

  readonly sizeGroupHelpText$ = combineLatest(
    this.currentSizeGroup$,
    this.status$
  ).pipe(
    map(([c, s]) => {
      switch (c) {
        case SizeGroup.Gzipped:
          return s && s.serverHost
            ? 'Gzipped stats not available for serve task'
            : 'Display the size of gzipped files';
        case SizeGroup.Parsed:
          return 'Display the size of files before gzip';
        default:
          return '';
      }
    })
  );

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

  readonly summaryAssetsSize$ = combineLatest(
    this.summary$,
    this.currentSizeGroup$
  ).pipe(
    map(([summary, sizeGroup]) => (summary ? summary.assets[sizeGroup] : null))
  );

  readonly summaryModulesSize$ = combineLatest(
    this.summary$,
    this.currentSizeGroup$
  ).pipe(
    map(([summary, sizeGroup]) => (summary ? summary.modules[sizeGroup] : null))
  );

  readonly summaryDependenciesSize$ = combineLatest(
    this.summary$,
    this.currentSizeGroup$
  ).pipe(
    map(([summary, sizeGroup]) =>
      summary ? summary.dependencies[sizeGroup] : null
    )
  );

  readonly openableOutputPath$ = this.status$.pipe(
    map(status =>
      status.buildStatus === 'build_success' ? status.outputPath : null
    )
  );

  readonly dependencyPercentage$ = combineLatest(
    this.status$,
    this.currentSizeGroup$
  ).pipe(
    map(([status, currentSizeGroup]) => {
      if (status && status.stats) {
        const { dependencies, modules } = status.stats.summary;
        const depSize = dependencies[currentSizeGroup];
        const moduleSize = modules[currentSizeGroup];
        return moduleSize > 0 ? ((depSize / moduleSize) * 100).toFixed(1) : '0';
      } else {
        return '0';
      }
    })
  );

  readonly sizeGroupLabel$ = this.currentSizeGroup$.pipe(
    map(s => this.getSizeGroupLabel(s))
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
        return 'error';
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
        return 'failure';
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
    this.currentChunkId$,
    this.currentSizeGroup$
  ).pipe(
    map(([chunks, id, sizeGroup]) => {
      const c = chunks.find(x => x.id === id);
      if (c) {
        return {
          id: c.id,
          name: c.name,
          file: c.file,
          size: c.sizes[sizeGroup]
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

  readonly viewingModules$ = combineLatest(
    this.modulesForCurrentChunk$,
    this.currentSizeGroup$
  ).pipe(
    map(([modules, sizeGroup]) => {
      if (!modules) {
        return null;
      }
      return modules.map((m: any) => [m.name, m.sizes[sizeGroup]]);
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
          // TODO(jack): There's a bug in vscode-only where the build is marked as a failure even though it succeeded.
          return status.stats ? 'Completed' : 'Failed';
        }
      }
    })
  );

  readonly networkSpeeds$ = combineLatest(
    this.summary$,
    this.currentSizeGroup$
  ).pipe(
    map(([summary, currentSizeGroup]) => {
      if (summary) {
        const size = summary.assets[currentSizeGroup];
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

  readonly displayAssets$ = combineLatest(
    this.status$,
    this.currentSizeGroup$
  ).pipe(
    map(([status, currentSizeGroup]) => {
      if (status && status.stats) {
        const sorted = status.stats.assets.sort((a, b) => {
          const aSize = a.sizes[currentSizeGroup];
          const bSize = b.sizes[currentSizeGroup];
          if (aSize > bSize) {
            return -1;
          } else if (aSize < bSize) {
            return 1;
          } else {
            return 0;
          }
        });

        return sorted.map(asset => {
          const size = asset.sizes[currentSizeGroup];
          return {
            ...asset,
            size: size,
            speeds: DISPLAY_ASSET_SPEEDS.map(key => {
              const speed = SPEEDS[key];
              const sizeInMB = size / 1000 / 1000;
              const rttInSeconds = speed.rtt / 1000;
              const speedInMBps = speed.mbps / 8;
              return {
                key,
                sizeGroup: GROUP_LABELS[currentSizeGroup],
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

  handleSizeGroupSelection(event: MatSelectChange) {
    this.currentSizeGroup$.next(event.value);
  }

  handleChunkFileSelection(event: MatSelectChange) {
    this.currentChunkId$.next(event.value);
  }
}
