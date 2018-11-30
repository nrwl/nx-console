import { Schematic, Field } from '@angular-console/schema';
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

  describe('normalizeSchematic', () => {
    const schematic: Schematic = {
      collection: '@nrwl/testing',
      name: 'normalized',
      description: 'a schematic to be normalized.',
      schema: [
        {
          type: 'arguments',
          name: 'required',
          enum: [],
          description: '',
          defaultValue: null,
          required: true,
          positional: false,
          important: false
        },
        {
          type: 'arguments',
          name: 'positional',
          enum: [],
          description: '',
          defaultValue: null,
          required: false,
          positional: true,
          important: false
        },
        {
          type: 'arguments',
          name: 'ignoreImportant',
          enum: [],
          description: '',
          defaultValue: null,
          required: false,
          positional: false,
          important: true
        }
      ]
    };
    let normalized: Schematic;
    it('should normalize the schematic, removing periods from the end of description', () => {
      normalized = serializer.normalizeSchematic(schematic);
      expect(normalized.description.lastIndexOf('.')).toBeLessThan(
        normalized.description.length
      );
    });
    it('should recognize positional and required fields as important but ignore previous values of important', () => {
      normalized.schema.forEach((field: Field) => {
        switch (field.name) {
          case 'required':
          case 'positional':
            expect(field.important).toEqual(true);
            break;
          case 'ignoreImportant':
            expect(field.important).toEqual(false);
            break;
        }
      });
    });
  });
});
