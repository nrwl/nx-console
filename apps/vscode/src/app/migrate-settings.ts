import { ExtensionContext } from 'vscode';
import { Settings } from '@angular-console/schema';
import { VSCodeStorage } from './vscode-storage';

const ConfigMap: { [key: string]: string | undefined } = {
  canCollectData: 'enableTelemetry',
  useNvm: 'useNVM'
};

// this can be removed once we are reasonably confident everyone is using a version of the extension
// that uses embedded settings. If it is removed before someone migrates, their settings will revert
// to default values
export function migrateSettings(context: ExtensionContext) {
  const state = context.globalState;
  const migrated = state.get('settingsMigrated');
  if (migrated) return;

  const existing: Settings | undefined = state.get('settings');
  if (!existing) return;

  const settings = Object.entries(existing);
  const store = VSCodeStorage.fromContext(context);

  for (let [key, value] of settings) {
    const mapped = ConfigMap[key];

    if (mapped) {
      value = store.set(mapped, value);
    } else {
      value = store.set(key, value);
    }
  }

  state.update('settingsMigrated', true);
}
