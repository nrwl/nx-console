import { authUtils, Store } from '@nrwl/angular-console-enterprise-electron';

export type UserState = 'untracked' | 'anonymous' | 'connected';

interface Settings {
  isConnectUser: boolean;
  canCollectData: boolean;
}

export type CheckConnection = () => boolean;
export type OnChange = (user: User) => void;

function isConnected(): boolean {
  return !!authUtils.getIdTokenFromStore();
}

export class User {
  static fromStorage(store: Store): User {
    authUtils.setStore(store);
    const settings: Settings | null = store.get('settings');
    let id: string | null = store.get('uuid');
    let state: UserState = 'anonymous';

    if (!id) {
      id = require('uuid/v4')();
      store.set('uuid', id);
    }

    const connected = authUtils.getIdTokenFromStore();
    if (connected) {
      state = 'connected';
    }

    if (settings && !settings.canCollectData) {
      state = 'untracked';
    }

    // the cast here is to make windows build happy, it shouldn't be necessary
    const user = new User(id as string, state, isConnected);
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
