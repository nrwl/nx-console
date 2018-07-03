import { Injectable } from '@angular/core';

export interface WorkspaceDescription {
  readonly path: string;
  readonly name: string;
}

const key = '$angularConsoleSettings';

@Injectable({
  providedIn: 'root'
})
export class Settings {
  getRecentWorkspaces(): WorkspaceDescription[] {
    const r = window.localStorage.getItem(key);
    return r ? JSON.parse(r).recent : [];
  }

  addRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    window.localStorage.setItem(key, JSON.stringify({recent: [w, ...r]}));
  }

  clear(): void {
    window.localStorage.clear();
  }
}
