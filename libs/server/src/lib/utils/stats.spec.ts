import { parseStats, calculateStatsFromChunks } from './stats';
import { join } from 'path';

class FakeFileSizeGetter {
  read(_path: string, _cwd?: string) {
    return {
      gzipped: 200,
      parsed: 1000
    };
  }
}

describe('stats utils', () => {
  let statsJson: any;

  beforeEach(() => {
    statsJson = require('./fixtures/stats.json');
  });

  describe('processStats', () => {
    it('returns stats for assets and modules', () => {
      const result = parseStats(
        statsJson,
        join(__dirname, 'fixtures'),
        new FakeFileSizeGetter()
      );
      expect(result.assets[0]).toEqual(
        expect.objectContaining({
          name: '3rdpartylicenses.txt',
          sizes: { gzipped: 200, parsed: 1000 }
        })
      );

      expect(result.chunks[0].file).toEqual('runtime.b57bf819d5bdce77f1c7.js');

      expect(result.summary.assets.gzipped).toBeDefined();
      expect(result.summary.assets.parsed).toBeDefined();
    });
  });

  describe('calculateStatsFromChunks', () => {
    it('returns stats for assets and modules', () => {
      const results = calculateStatsFromChunks([
        { name: 'main', file: 'main.js', size: '1 MB', type: 'initial' },
        {
          name: 'polyfills',
          file: 'polyfills.js',
          size: '200 kB',
          type: 'initial'
        },
        { name: 'runtime', file: 'runtime.js', size: '5.0 kB', type: 'entry' },
        { name: 'styles', file: 'styles.js', size: '500 B', type: 'initial' }
      ]);

      expect(results.summary.assets.parsed).toEqual(
        1000000 + 200000 + 5000 + 500
      );
      expect(results.summary.modules).toEqual(1000000 + 200000 + 5000 + 500);
    });
  });
});
