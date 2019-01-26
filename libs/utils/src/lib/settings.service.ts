import { Injectable } from '@angular/core';
import { first, tap } from 'rxjs/operators';
import {
  SettingsGQL,
  UpdateSettingsGQL,
  Settings as SettingsModels
} from './generated/graphql';

export { Settings as SettingsModels } from './generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class Settings {
  settings: SettingsModels.Settings = {
    recent: [],
    canCollectData: false,
    installNodeManually: false,
    enableDetailedStatus: true,
    isConnectUser: false,
    channel: 'latest'
  };

  constructor(
    private readonly settingsGQL: SettingsGQL,
    private readonly updateSettingsGQL: UpdateSettingsGQL
  ) {}

  getRecentWorkspaces(favorite?: boolean): SettingsModels.Recent[] {
    const all: SettingsModels.Recent[] = this.settings.recent || [];
    switch (favorite) {
      case undefined:
        return all;
      case false:
        return all.filter(w => !w.favorite);
      case true:
        return all.filter(w => w.favorite);
    }
  }

  toggleFavorite(w: SettingsModels.Recent): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    const favorite: SettingsModels.Recent = { ...w, favorite: !w.favorite };
    this.store({ ...this.settings, recent: [...r, favorite] });
  }

  addRecent(w: SettingsModels.Recent): void {
    if (
      this.getRecentWorkspaces().filter(rr => rr.path === w.path).length === 0
    ) {
      this.store({
        ...this.settings,
        recent: [w, ...this.settings.recent]
      });
    }
  }

  removeRecent(w: SettingsModels.Recent): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    this.store({ ...this.settings, recent: [...r] });
  }

  canCollectData(): boolean | undefined {
    return this.settings.canCollectData;
  }

  enableDetailedStatus() {
    return this.settings.enableDetailedStatus;
  }

  getChannel() {
    return this.settings.channel;
  }

  showConnectPlugin(): boolean {
    return true;
  }

  isConnectUser(): boolean {
    return this.settings.isConnectUser || false;
  }

  showDocs(): boolean | undefined {
    return true;
  }

  setCanCollectData(canCollectData: boolean): void {
    this.store({ ...this.settings, canCollectData });
  }

  setInstallManually(installNodeManually: boolean): void {
    this.store({ ...this.settings, installNodeManually });
  }

  setEnableDetailedStatus(enableDetailedStatus: boolean): void {
    this.store({ ...this.settings, enableDetailedStatus });
  }

  setChannel(channel: 'latest' | 'beta' | 'alpha'): void {
    this.store({ ...this.settings, channel });
  }

  fetch() {
    return this.settingsGQL.fetch().pipe(
      first(),
      tap(r => {
        this.settings = (r.data as any).settings;
      })
    );
  }

  private store(v: SettingsModels.Settings) {
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
