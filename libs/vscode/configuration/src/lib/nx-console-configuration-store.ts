import {
  ConfigurationTarget,
  ExtensionContext,
  workspace,
  Memento,
} from 'vscode';
import { Store } from '@nx-console/server';
import { CONFIG_KEYS, ConfigKeys } from './configuration-keys';

let CONFIG_STORE: NxConsoleConfigurationStore;

export class NxConsoleConfigurationStore implements Store {
  static configurationSection = 'nxConsole';

  static fromContext(context: ExtensionContext): NxConsoleConfigurationStore {
    CONFIG_STORE = new NxConsoleConfigurationStore(context.globalState);
    return CONFIG_STORE;
  }

  static get instance() {
    if (!CONFIG_STORE) {
      throw Error(
        'Please create a configuration store with `fromContext` first'
      );
    }
    return CONFIG_STORE;
  }

  private constructor(private readonly state: Memento) {}

  get<T>(key: ConfigKeys, defaultValue?: T): T | null {
    const value = this.storage(key).get(key, defaultValue);
    return typeof value === 'undefined' ? defaultValue || null : value;
  }

  set<T>(key: ConfigKeys, value: T): void {
    this.storage(key).update(key, value);
  }

  delete(key: ConfigKeys): void {
    this.storage(key).update(key, undefined);
  }

  storage(key: ConfigKeys): Memento {
    return isConfig(key) ? this.config : this.state;
  }

  get config() {
    return workspace.getConfiguration(
      NxConsoleConfigurationStore.configurationSection
    );
  }
}

function isConfig(key: ConfigKeys): boolean {
  return CONFIG_KEYS.includes(key);
}

export interface VSCState {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any, target: ConfigurationTarget): void;
}
