import { ExtensionContext } from 'vscode';
import { Store } from '@nrwl/angular-console-enterprise-electron';

export class VSCodeStorage implements Store {
  static fromContext(context: ExtensionContext): VSCodeStorage {
    const store = new VSCodeStorage(context.globalState);
    return store;
  }

  constructor(private readonly state: VSCGlobalState) {}

  get<T>(key: string, defaultValue?: T): T | null {
    const value = this.state.get(key, defaultValue);
    return value || defaultValue || null;
  }

  set<T>(key: string, value: T): void {
    this.state.update(key, value);
  }

  delete(key: string): void {
    this.state.update(key, undefined);
  }
}

export interface VSCGlobalState {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): void;
}

export class SubstituteGlobalState implements VSCGlobalState {
  state: { [key: string]: any } = {};

  get<T>(key: string, defaultValue?: T): T {
    return this.state[key] || defaultValue;
  }

  update<T>(key: string, value: T): void {
    this.state[key] = value;
  }
}
