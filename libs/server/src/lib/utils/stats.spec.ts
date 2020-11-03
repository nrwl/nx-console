import { generateStats } from './stats';
import { join } from 'path';

describe('stats utils', () => {
  describe('generateStats', () => {
    it('returns stats with sourcemap', () => {
      const result = generateStats(
        'dist/apps/example',
        join(__dirname, 'fixtures'),
        new Date(1970, 1, 1).getTime()
      );
      expect(result.assets[0]).toEqual(
        expect.objectContaining({
          file: 'data.json',
          sizes: { gzipped: 43, parsed: 23 }
        })
      );

      expect(result.assets.map(x => x.file)).not.toContain('stats.json');
      expect(result.bundles[0].file).toEqual('main.js');
      expect(result.modulesByBundle['main.js'].map(x => x.file)).toContain(
        'node_modules/rxjs/_esm5/internal/observable/of.js'
      );
      expect(
        result.modulesByBundle['main.js'].find(x => x.file === 'main.ts')
      ).toEqual(
        expect.objectContaining({
          isDep: false
        })
      );
      expect(result.modulesByBundle['no.sourcemap.js']).toEqual([
        {
          file: 'no.sourcemap.js',
          size: 54,
          isDep: false
        }
      ]);
      expect(result.summary.assets.gzipped).toBeGreaterThan(0);
      expect(result.summary.assets.parsed).toBeGreaterThan(0);
      expect(result.summary.modules).toBeGreaterThan(0);
      expect(result.summary.dependencies).toBeGreaterThan(0);
    });

    it('returns stats without sourcemap or stats.json', () => {
      const result = generateStats(
        'dist/apps/no-stats',
        join(__dirname, 'fixtures'),
        new Date(1970, 1, 1).getTime()
      );
      expect(result.summary.modules).toBeGreaterThan(0);
      expect(result.summary.dependencies).toEqual(0);
    });
  });
});
