/* tslint:disable */

const Store = require('electron-store');
const store = new Store();

export function readSettings() {
  const settings = store.get('settings') || {};
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
  return settings;
}

export function storeSettings(value: any) {
  store.set('settings', value);
}
