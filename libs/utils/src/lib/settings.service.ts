import { Injectable } from '@angular/core';

export interface WorkspaceDescription {
  readonly path: string;
  readonly name: string;
  readonly favorite?: boolean;
}

const key = '$angularConsoleSettings';










@Injectable({
  providedIn: 'root'
})
export class Settings {
  getRecentWorkspaces(favorite?: boolean): WorkspaceDescription[] {
    const all: WorkspaceDescription[] = this.read().recent || [];
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
    this.store({ recent: [favorite, ...r] });
  }

  addRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    this.store({ recent: [w, ...r] });
  }

  removeRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    this.store({ recent: [...r] });
  }




  clear(): void {
    window.localStorage.clear();
  }

  canCollectData(): boolean | undefined {
    return this.read().canCollectData;
  }

  setCanCollectData(canCollectData: boolean): void {
    this.store({ canCollectData });
  }

  private store(v: { [k: string]: any }) {
    const prev = this.read();
    window.localStorage.setItem(key, JSON.stringify({ ...prev, ...v }));
  }

  private read() {
    try {
      const settingsStr = window.localStorage.getItem(key);
      return settingsStr ? JSON.parse(settingsStr) : {};
    } catch (e) {
      return {};
    }
  }
}
