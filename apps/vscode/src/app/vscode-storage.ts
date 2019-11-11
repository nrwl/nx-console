import { ConfigurationTarget, ExtensionContext, workspace } from 'vscode';
import { Store } from '@angular-console/server';

export class VSCodeStorage implements Store {
  static configurationSection = 'angularConsole';

  static fromContext(context: ExtensionContext): VSCodeStorage {
    const config = workspace.getConfiguration(this.configurationSection);
    const store = new VSCodeStorage(config, context.globalState);
    return store;
  }

  constructor(
    private readonly config: VSCState,
    private readonly state: VSCState
  ) {}

  get<T>(key: string, defaultValue?: T): T | null {
    const value = this.storage(key).get(key, defaultValue);
    return value || defaultValue || null;
  }

  set<T>(key: string, value: T): void {
    this.storage(key).update(key, value, ConfigurationTarget.Global);
  }

  delete(key: string): void {
    this.storage(key).update(key, undefined, ConfigurationTarget.Global);
  }

  storage(key: string): VSCState {
    return isConfig(key) ? this.config : this.state;
  }
}

const ConfigKeys = ['disableTelemetry', 'useNVM'];

function isConfig(key: string): boolean {
  return ConfigKeys.includes(key);
}

export interface VSCState {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any, target: ConfigurationTarget): void;
}

export class SubstituteState implements VSCState {
  state: { [key: string]: any } = {};

  get<T>(key: string, defaultValue?: T): T {
    return this.state[key] || defaultValue;
  }

  update<T>(key: string, value: T): void {
    this.state[key] = value;
  }
}
