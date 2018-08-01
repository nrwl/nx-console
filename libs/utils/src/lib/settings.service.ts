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
    const r = window.localStorage.getItem(key);
    const all: Array<WorkspaceDescription> = r ? JSON.parse(r).recent : [];

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
    window.localStorage.setItem(
      key,
      JSON.stringify({ recent: [favorite, ...r] })
    );
  }

  addRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    window.localStorage.setItem(key, JSON.stringify({ recent: [w, ...r] }));
  }

  removeRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    window.localStorage.setItem(key, JSON.stringify({ recent: [...r] }));
  }

  clear(): void {
    window.localStorage.clear();
  }
}
