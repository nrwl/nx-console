import { Settings } from './settings.service';

describe('Settings', () => {
  let settings: Settings;

  beforeEach(() => {
    settings = new Settings();
  });

  it('should not add the same project twice', () => {
    settings.addRecent({ name: 'one', path: 'one', favorite: true });
    expect(settings.getRecentWorkspaces()).toEqual([
      { name: 'one', path: 'one', favorite: true }
    ]);

    settings.addRecent({ name: 'one', path: 'one' });
    expect(settings.getRecentWorkspaces()).toEqual([
      { name: 'one', path: 'one', favorite: true }
    ]);
  });
});
