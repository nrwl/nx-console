import { User } from './user';

describe('Telemetry: User', () => {
  const id = 'id';

  it('can be marked as untracked', () => {
    const user = new User(id);
    user.untracked();

    expect(user.state).toEqual('untracked');
  });

  it('when tracking is enabled, checks if the user is connected', () => {
    const user = new User(id, 'untracked', () => true);

    user.tracked();

    expect(user.state).toEqual('connected');
  });

  it('when tracking is enabled, checks if the user is not connected', () => {
    const user = new User(id, 'untracked', () => false);

    user.tracked();

    expect(user.state).toEqual('anonymous');
  });

  it('only notifies of changes when the state actually changes', () => {
    const user = new User(id);

    user.loggedOut();
  });

  describe('predicates', () => {
    it('checks if it is anonymous', () => {
      const user = new User(id, 'anonymous');
      const check = user.isAnonymous();
      expect(check).toBe(true);
    });

    it('checks if it is untracked', () => {
      const user = new User(id, 'untracked');
      const check = user.isUntracked();
      expect(check).toBe(true);
    });

    it('checks if it is connected', () => {
      const user = new User(id, 'connected');
      const check = user.isConnected();
      expect(check).toBe(true);
    });
  });

  describe('when tracked', () => {
    it('can be logged in', () => {
      const user = new User(id, 'anonymous');

      user.loggedIn();

      expect(user.state).toEqual('connected');
    });

    it('can be logged out', () => {
      const user = new User(id, 'connected');

      user.loggedOut();

      expect(user.state).toEqual('anonymous');
    });
  });

  describe('when untracked', () => {
    const user = new User(id, 'untracked');

    it('cant be logged in', () => {
      user.loggedIn();

      expect(user.state).toEqual('untracked');
    });

    it('cant be logged out', () => {
      user.loggedOut();

      expect(user.state).toEqual('untracked');
    });
  });
});
