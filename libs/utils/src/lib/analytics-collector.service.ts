import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

declare var global: any;

@Injectable()
export class AnalyticsCollector {
  private readonly ipc: any;

  constructor(private readonly router: Router) {
    if (typeof global !== 'undefined' && global.require) {
      try {
        this.ipc = global.require('electron').ipcRenderer;
      } catch (e) {
        console.error(
          'Could not get a hold of ipcRenderer to log to analytics'
        );
      }
    }
  }

  setUpRouterLogging() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event =>
        this.reportPageView(cleanUpUrl((event as NavigationEnd).url))
      );
  }

  reportException(description: string) {
    if (this.ipc) {
      this.ipc.send('reportException', { description });
    }
  }

  reportDataCollectionEvent(value: boolean) {
    if (this.ipc) {
      this.ipc.send('dataCollectionEvent', { value });
    }
  }

  private reportPageView(path: string) {
    if (this.ipc) {
      this.ipc.send('reportPageView', { path });
    }
  }
}

export function cleanUpUrl(url: string): string {
  if (url.startsWith('/workspace/')) {
    const parts = url.split('/');
    // tslint:disable-next-line
    return [parts[0], parts[1], 'PATH', ...parts.slice(3)].join('/');
  } else {
    return url;
  }
}
