import { Store } from '@angular-console/server';

export type UserState = 'untracked' | 'anonymous' | 'connected';

interface Settings {
  isConnectUser: boolean;
  canCollectData: boolean;
}

export type CheckConnection = () => boolean;
export type OnChange = (user: User) => void;

export class User {
  static fromStorage(store: Store): User {
    const settings: Settings | null = store.get('settings');
    let id: string | null = store.get('uuid');
    let state: UserState = 'anonymous';

    if (!id) {
      id = require('uuid/v4')();
      store.set('uuid', id);
    }

    if (settings && !settings.canCollectData) {
      state = 'untracked';
    }

    // the cast here is to make windows build happy, it shouldn't be necessary
    const user = new User(id as string, state);
    return user;
  }

  constructor(
    readonly id: string,
    public state: UserState = 'anonymous',
    private readonly checkConnection: CheckConnection = () => false
  ) {}

  loggedIn() {
    if (this.isUntracked()) return;
    this.state = 'connected';
  }

  loggedOut() {
    if (this.isUntracked()) return;
    this.state = 'anonymous';
  }

  tracked() {
    if (this.checkConnection()) {
      this.state = 'connected';
    } else {
      this.state = 'anonymous';
    }
  }

  untracked() {
    this.state = 'untracked';
  }

  isAnonymous() {
    return this.state === 'anonymous';
  }

  isUntracked(): boolean {
    return this.state === 'untracked';
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }
}
