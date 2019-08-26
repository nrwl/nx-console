import { normalizeSchema, seconds } from './utils';

describe('utils', () => {
  describe('normalizeSchema', () => {
    it('should mark fields as required if they are listed in the required array', () => {
      const r = normalizeSchema({
        properties: { one: {} },
        required: ['one']
      });
      expect(r[0].required).toBeTruthy();
    });

    it('should mark fields as required if they have source', () => {
      const r = normalizeSchema({
        properties: { one: { $default: { $source: 'argv' } } },
        required: []
      });
      expect(r[0].required).toBeTruthy();
    });

    it('measures seconds', () => {
      const returns = 'result';
      const [elapsed, result] = seconds(() => returns);

      expect(elapsed).toEqual(0);
      expect(result).toEqual(returns);
    });

    it('should not mark fields as required otherwise', () => {
      const r = normalizeSchema({
        properties: { one: {} },
        required: []
      });
      expect(r[0].required).toBeFalsy();
    });
  });
});
