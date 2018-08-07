import { Injectable } from '@angular/core';
declare var global: any;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly ipc: any;
  isElectron = false;

  constructor() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf(' electron/') > -1) {
      this.isElectron = true;
    }

    if (typeof global !== 'undefined' && global.require) {
      try {
        this.ipc = global.require('electron').ipcRenderer;
        console.log('Ipc ', this.ipc);
      } catch (e) {
        console.error('Could not get ahold of ipcRenderer to log to analytics');
      }
    }
  }

  reportPageView(path: string) {
    return this.isElectron
      ? this.ipc.send('reportPageView', { path: path })
      : null;
  }

  reportEvent(event: any) {
    return this.isElectron ? this.ipc.send('reportEvent', event) : null;
  }

  reportException(event: any = { message: 'UnKnown Error' }) {
    return this.isElectron
      ? this.ipc.send('reportException', { description: event.message })
      : null;
  }
}
