import { Settings } from './settings.service';
import { of } from 'rxjs';

describe('Settings', () => {
  let settings: Settings;

  beforeEach(() => {
    settings = new Settings({
      query() {
        return of({
          data: { settings: { canCollectData: false, recent: [] } }
        });
      },
      mutate() {
        return of();
      }
    } as any);

    settings.fetch().subscribe();
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
