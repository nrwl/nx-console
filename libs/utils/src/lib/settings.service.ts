import { Injectable } from '@angular/core';
import { first, tap } from 'rxjs/operators';
import { SettingsGQL, UpdateSettingsGQL } from './generated/graphql';

export interface WorkspaceDescription {
  readonly path: string;
  readonly name: string;
  readonly favorite?: boolean;
}

interface SettingsData {
  readonly recent: WorkspaceDescription[];
  readonly canCollectData: boolean;
  readonly installNodeManually: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Settings {
  private settings: SettingsData = {
    recent: [],
    canCollectData: false,
    installNodeManually: false
  };

  constructor(
    private readonly settingsGQL: SettingsGQL,
    private readonly updateSettingsGQL: UpdateSettingsGQL
  ) {}

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

  showConnectPlugin(): boolean | undefined {
    return true;
  }

  showBackgroundTasks(): boolean | undefined {
    return false;
  }

  setCanCollectData(canCollectData: boolean): void {
    this.store({ ...this.settings, canCollectData });
  }

  setInstallManually(installNodeManually: boolean): void {
    this.store({ ...this.settings, installNodeManually });
  }

  fetch() {
    return this.settingsGQL.fetch().pipe(
      first(),
      tap(r => {
        this.settings = (r.data as any).settings;
      })
    );
  }

  private store(v: SettingsData) {
    this.settings = v;
    this.updateSettingsGQL
      .mutate({
        data: JSON.stringify({ ...v })
      })
      .subscribe(r => {
        this.settings = (r.data as any).updateSettings;
      });
  }
}
