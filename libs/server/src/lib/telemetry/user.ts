import { Store } from '@nx-console/server';

export type UserState = 'untracked' | 'tracked';

export class User {
  static fromStorage(store: Store): User {
    let id: string | null = store.get('uuid');
    let state: UserState = 'tracked';

    if (!id) {
      id = require('uuid/v4')();
      store.set('uuid', id);
    }

    if (!store.get('enableTelemetry', true)) {
      state = 'untracked';
    }

    return new User(id as string, state);
  }

  constructor(readonly id: string, public state: UserState = 'tracked') {}

  tracked() {
    this.state = 'tracked';
  }

  untracked() {
    this.state = 'untracked';
  }

  isTracked() {
    return this.state === 'tracked';
  }

  isUntracked(): boolean {
    return this.state === 'untracked';
  }
}
