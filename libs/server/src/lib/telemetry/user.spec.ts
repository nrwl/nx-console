import { User } from './user';

describe('Telemetry: User', () => {
  const id = 'id';

  it('can be marked as untracked', () => {
    const user = new User(id);
    user.untracked();

    expect(user.state).toEqual('untracked');
  });

  it('can be marked as tracked', () => {
    const user = new User(id, 'untracked');

    user.tracked();

    expect(user.state).toEqual('tracked');
  });

  describe('predicates', () => {
    it('checks if it is tracked', () => {
      const user = new User(id, 'tracked');
      const check = user.isTracked();
      expect(check).toBe(true);
    });

    it('checks if it is untracked', () => {
      const user = new User(id, 'untracked');
      const check = user.isUntracked();
      expect(check).toBe(true);
    });
  });
});
