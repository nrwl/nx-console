import { Injectable } from '@angular/core';
import { first, tap } from 'rxjs/operators';

import {
  Settings as SettingsModels,
  SettingsGQL,
  UpdateSettingsGQL,
  Maybe
} from './generated/graphql';
import { BehaviorSubject } from 'rxjs';

export { Settings as SettingsModels } from './generated/graphql';

export function toggleItemInArray<T>(array: T[], item: T): T[] {
  return array.includes(item)
    ? array.filter(value => value !== item)
    : [...array, item];
}

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
    channel: 'latest',
    disableAnimations: true,
    isWsl: false,
    useNvm: false
  };

  constructor(
    private readonly settingsGQL: SettingsGQL,
    private readonly updateSettingsGQL: UpdateSettingsGQL
  ) {}

  getRecentWorkspaces(favorite?: boolean): SettingsModels.Recent[] {
    const all: SettingsModels.Recent[] =
      this.settings.recent.map(w => {
        if (!w.pinnedProjectNames) {
          w.pinnedProjectNames = [];
        }
        return w;
      }) || [];
    switch (favorite) {
      case undefined:
        return all;
      case false:
        return all.filter(w => !w.favorite);
      case true:
        return all.filter(w => w.favorite);
    }
  }

  getWorkspace(path: string): SettingsModels.Recent | undefined {
    return (this.settings.recent || []).find(w => w.path === path);
  }

  toggleFavorite(w: SettingsModels.Recent): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    const favorite: SettingsModels.Recent = { ...w, favorite: !w.favorite };
    this.store({ ...this.settings, recent: [...r, favorite] });
  }

  toggleProjectPin(path: string, project: { name: string }): void {
    const workspace = this.getWorkspace(path);
    if (!workspace) {
      console.warn('No workspace found at path: ', path);
      return;
    }
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== path);
    const modifiedWorkspace: SettingsModels.Recent = {
      ...workspace,
      pinnedProjectNames: toggleItemInArray(
        workspace.pinnedProjectNames || [],
        project.name
      )
    };
    this.store({ ...this.settings, recent: [...r, modifiedWorkspace] });
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

  private readonly disabledAnimationsSubject = new BehaviorSubject<
    Maybe<boolean>
  >(this.settings.disableAnimations);
  readonly disabledAnimations$ = this.disabledAnimationsSubject.asObservable();

  setDisableAnimations(disableAnimations: boolean): void {
    this.store({ ...this.settings, disableAnimations });
    this.disabledAnimationsSubject.next(disableAnimations);
  }

  useDisableAnimations() {
    return this.settings.disableAnimations;
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

  isWsl(): boolean {
    return !!this.settings.isWsl;
  }

  useNvm(): boolean {
    return Boolean(this.settings.useNvm);
  }

  setIsWsl(isWsl: boolean): void {
    this.store({ ...this.settings, isWsl });
  }

  setUseNvm(useNvm: boolean): void {
    this.store({ ...this.settings, useNvm });
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
