import { normalizeSchema } from './utils';

describe('utils', () => {
  describe('normalizeSchema', () => {
    it('should mark fields as required if they are listed in the required array', async () => {
      const r = await normalizeSchema({
        properties: { one: {} },
        required: ['one']
      });
      expect(r[0].required).toBeTruthy();
    });

    it('should not mark fields as required otherwise', async () => {
      const r = await normalizeSchema({
        properties: { one: {} },
        required: []
      });
      expect(r[0].required).toBeFalsy();
    });

    it('should sort positional arguments by ascending order', async () => {
      const r = await normalizeSchema({
        properties: {
          a: { $default: { $source: 'argv', index: 0 } },
          b: { $default: { $source: 'argv', index: 2 } },
          c: { $default: { $source: 'argv', index: 1 } }
        },
        required: []
      });
      expect(r.map(x => x.name)).toEqual(['a', 'c', 'b']);
    });
  });
});
