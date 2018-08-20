import { Injectable } from '@angular/core';

export interface WorkspaceDescription {
  readonly path: string;
  readonly name: string;
  readonly favorite?: boolean;
}

declare var global: any;

interface SettingsData {
  readonly recent: WorkspaceDescription[];
  readonly canCollectData: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Settings {
  private readonly ipc: any;
  private settings: SettingsData;

  constructor() {
    if (typeof global !== 'undefined' && global.require) {
      try {
        this.ipc = global.require('electron').ipcRenderer;
        this.settings = this.ipc.sendSync('readSettings');
      } catch (e) {
        console.error('Could not get a hold of ipcRenderer to log settings');
      }
    } else {
      this.settings = { recent: [], canCollectData: false };
    }
  }

  getRecentWorkspaces(favorite?: boolean): WorkspaceDescription[] {
    const all: WorkspaceDescription[] = this.settings.recent || [];
    switch (favorite) {
      case undefined:
        return all;
      case false:
        return all.filter(w => !w.favorite);
      case true:
        return all.filter(w => w.favorite);
    }
  }

  toggleFavorite(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    const favorite: WorkspaceDescription = { ...w, favorite: !w.favorite };
    this.store({ ...this.settings, recent: [favorite, ...r] });
  }

  addRecent(w: WorkspaceDescription): void {
    if (
      this.getRecentWorkspaces().filter(rr => rr.path === w.path).length === 0
    ) {
      this.store({ ...this.settings, recent: [w, ...this.settings.recent] });
    }
  }

  removeRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    this.store({ ...this.settings, recent: [...r] });
  }

  canCollectData(): boolean | undefined {
    return this.settings.canCollectData;
  }

  setCanCollectData(canCollectData: boolean): void {
    this.store({ ...this.settings, canCollectData });
  }

  private store(v: SettingsData) {
    this.settings = v;
    if (this.ipc) {
      this.ipc.send('storeSettings', v);
    }
  }
}
