import {
  ConfigurationTarget,
  ExtensionContext,
  workspace,
  Memento,
} from 'vscode';
import { Store } from '@nx-console/shared/schema';
import { GLOBAL_CONFIG_KEYS, GlobalConfigKeys } from './configuration-keys';

let CONFIG_STORE: GlobalConfigurationStore;

export class GlobalConfigurationStore implements Store {
  static configurationSection = 'nxConsole';

  static fromContext(context: ExtensionContext): GlobalConfigurationStore {
    CONFIG_STORE = new GlobalConfigurationStore(context.globalState);
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

  get<T>(key: GlobalConfigKeys, defaultValue?: T): T | null {
    const value = this.storage(key).get(key, defaultValue);
    return typeof value === 'undefined' ? defaultValue || null : value;
  }

  set<T>(key: GlobalConfigKeys, value: T): void {
    this.storage(key).update(key, value);
  }

  delete(key: GlobalConfigKeys): void {
    this.storage(key).update(key, undefined);
  }

  storage(key: GlobalConfigKeys): VSCState {
    return isConfig(key) ? this.config : this.state;
  }

  get config() {
    return workspace.getConfiguration(
      GlobalConfigurationStore.configurationSection
    );
  }
}

function isConfig(key: GlobalConfigKeys): boolean {
  return GLOBAL_CONFIG_KEYS.includes(key);
}

export interface VSCState {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any, target?: ConfigurationTarget): void;
}
