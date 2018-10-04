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
  if (!settings.installNodeManually) {
    settings.installNodeManually = false;
  }
  return settings;
}

export function storeSettings(value: any) {
  store.set('settings', value);
}
