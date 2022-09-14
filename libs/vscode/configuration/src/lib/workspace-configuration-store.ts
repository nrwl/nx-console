import { Store } from '@nx-console/shared/schema';
import { ExtensionContext, Memento } from 'vscode';
import { WorkspaceConfigKeys } from './configuration-keys';

let CONFIG_STORE: WorkspaceConfigurationStore;

/**
 * Configuration store that has config related to the opened workspace in vscode
 */
export class WorkspaceConfigurationStore implements Store {
  static fromContext(context: ExtensionContext): WorkspaceConfigurationStore {
    CONFIG_STORE = new WorkspaceConfigurationStore(context.workspaceState);
    return CONFIG_STORE;
  }

  /**
   * Returns the instance of WorkspaceConfigurationStore
   */
  static get instance() {
    if (!CONFIG_STORE) {
      throw Error(
        'Please create a configuration store with `fromContext` first'
      );
    }
    return CONFIG_STORE;
  }

  constructor(private readonly state: Memento) {}

  delete(key: WorkspaceConfigKeys): void {
    this.state.update(key, undefined);
  }

  get<T>(key: WorkspaceConfigKeys, defaultValue: T) {
    const config = this.state.get(key, defaultValue);
    return typeof config === 'undefined' ? defaultValue : config;
  }

  set<T>(key: WorkspaceConfigKeys, value: T): void {
    this.state.update(key, value);
  }
}
