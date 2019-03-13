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

      expect(result.chunks[0].file).toEqual('runtime.a5dd35324ddfd942bef1.js');

      expect(Object.keys(result.modulesByChunkId).length).toEqual(5);
      expect(result.modulesByChunkId[0].length).toEqual(0);
      expect(result.modulesByChunkId[1].length).toEqual(234);

      expect(result.summary.assets.gzipped).toBeDefined();
      expect(result.summary.assets.parsed).toBeDefined();
      expect(result.summary.modules.gzipped).toBeDefined();
      expect(result.summary.modules.parsed).toBeDefined();
      expect(result.summary.dependencies.gzipped).toBeDefined();
      expect(result.summary.dependencies.parsed).toBeDefined();
      expect(
        result.summary.modules.parsed >= result.summary.dependencies.parsed
      ).toBe(true);
      expect(
        result.summary.modules.gzipped >= result.summary.dependencies.gzipped
      ).toBe(true);
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
      expect(results.summary.modules.parsed).toEqual(
        1000000 + 200000 + 5000 + 500
      );
    });
  });
});
