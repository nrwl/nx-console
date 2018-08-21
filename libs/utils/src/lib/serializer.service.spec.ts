import { Serializer } from './serializer.service';

describe('Serializer', () => {
  let serializer: Serializer;

  beforeEach(() => {
    serializer = new Serializer();
  });

  describe('serializeArgs', () => {
    it('should split fields of type "arguments"', () => {
      const serialized = serializer.serializeArgs(
        { field: ' --   --one=two' },
        [
          {
            type: 'arguments',
            name: 'field',
            enum: [],
            description: '',
            defaultValue: null,
            required: false,
            positional: false,
            important: false
          }
        ]
      );
      expect(serialized).toEqual(['--', '--one=two']);
    });
  });
});
