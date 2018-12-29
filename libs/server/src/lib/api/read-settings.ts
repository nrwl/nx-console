import { Store } from '@nrwl/angular-console-enterprise-electron';

interface Settings {
  canCollectData?: boolean;
  recent?: [];
  installNodeManually?: boolean;
  enableDetailedStatus?: boolean;
  channel?: string;
  isConnectUser?: boolean;
}

/* tslint:disable */
export function readSettings(store: Store) {
  const settings: Settings = store.get('settings') || {};
  if (settings.canCollectData === undefined) {
    settings.canCollectData = store.get('canCollectData', false);
  }
  if (settings.recent === undefined) {
    settings.recent = [];
  }
  if (settings.installNodeManually === undefined) {
    settings.installNodeManually = false;
  }
  if (settings.enableDetailedStatus === undefined) {
    settings.enableDetailedStatus = true;
  }
  if (settings.channel === undefined) {
    settings.channel = 'latest';
  }
  const authUtils = require('@nrwl/angular-console-enterprise-electron')
    .authUtils;
  settings.isConnectUser = !!authUtils.getIdTokenFromStore();
  return settings;
}

export function storeSettings(store: Store, value: any) {
  store.set('settings', value);
}
