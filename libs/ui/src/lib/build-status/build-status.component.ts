import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnDestroy
} from '@angular/core';
import {
  CommandStatus,
  OpenInBrowserService,
  ShowItemInFolderService
} from '@angular-console/utils';
import { SPEEDS } from './speed-constants';
import { Subject, BehaviorSubject, combineLatest, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material';
import { GROW_SHRINK_VERT } from '../animations/grow-shink';
import { Stats } from '@angular-console/schema';

export interface BuildStatus {
  buildStatus:
    | 'build_pending'
    | 'build_inprogress'
    | 'build_success'
    | 'build_failure';
  progress: number;
  date: string;
  time: string;
  errors: string[];
  serverHost?: string;
  serverPort?: number;
  isForProduction: boolean;
  outputPath?: string;
  indexFile?: string;
  stats: Stats;
}

const DISPLAY_ASSET_SPEEDS = ['4g', '3gf', '3gs'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-build-status',
  templateUrl: './build-status.component.html',
  styleUrls: ['./build-status.component.scss'],
  animations: [GROW_SHRINK_VERT]
})
export class BuildStatusComponent implements OnDestroy {
  @Input()
  commandStatus: CommandStatus;

  @Input()
  set status(s: BuildStatus) {
    this.allStatus$.next(s);
  }

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
        a.time === b.time &&
        a.stats === b.stats
    )
  );

  readonly selectedBundleFile$ = new BehaviorSubject<string>('');

  readonly errors$ = this.status$.pipe(
    map(status => {
      if (status) {
        // Only show unique values
        return status.errors.filter((x, idx, ary) => ary.indexOf(x) === idx);
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

  readonly bundles$ = this.status$.pipe(
    map(status => {
      if (status && status.stats && status.stats.bundles) {
        return status.stats.bundles;
      } else {
        return [];
      }
    })
  );

  bundlesSubscription = this.bundles$.subscribe(bundles => {
    const defaultBundle = bundles.find(x => /main/.test(x.file)) || bundles[0];
    if (defaultBundle) {
      this.selectedBundleFile$.next(defaultBundle.file);
    }
  });

  readonly currentBundle$ = combineLatest(
    this.bundles$,
    this.selectedBundleFile$
  ).pipe(
    map(([bundles, selected]) => {
      const c = bundles.find(x => x.file === selected);
      if (c) {
        return {
          file: c.file,
          sizes: c.sizes
        };
      } else {
        return null;
      }
    })
  );

  readonly modulesForCurrentBundle$ = combineLatest(
    this.status$,
    this.selectedBundleFile$
  ).pipe(
    map(([status, currentBundle]) => {
      if (!currentBundle || !status) {
        return null;
      }
      return (
        status.stats &&
        status.stats.modulesByBundle &&
        status.stats.modulesByBundle[currentBundle]
      );
    })
  );

  readonly viewingModules$ = this.modulesForCurrentBundle$.pipe(
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

  ngOnDestroy() {
    this.bundlesSubscription.unsubscribe();
  }

  getSpeedLabel(key: string) {
    return SPEEDS[key] ? SPEEDS[key].label : '';
  }

  trackByString(_: number, x: string) {
    return x;
  }

  trackByFile(_: number, x: { file: string }) {
    return x.file;
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
    this.selectedBundleFile$.next(event.value);
  }
}
