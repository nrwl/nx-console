import {
  compareWithDefaultValue,
  extractDefaultValue,
  extractItemOptions,
  getGeneratorIdentifier,
  getGeneratorNameTitleCase,
} from './generator-schema-utils';
import { OptionType } from '@nx-console/shared/schema';

describe('generator schema utils', () => {
  describe('getGeneratorIdentifier', () => {
    it('should return an empty string if the generator schema is undefined', () => {
      expect(getGeneratorIdentifier(undefined)).toEqual('');
    });

    it('should return the generator identifier', () => {
      expect(
        getGeneratorIdentifier({
          generatorName: 'library',
          collectionName: 'react',
          description: 'Generate a React library',
          options: [],
        })
      ).toEqual('react:library');
    });
  });

  describe('getGeneratorNameTitleCase', () => {
    it('should return an empty string if the generator schema is undefined', () => {
      expect(getGeneratorNameTitleCase(undefined)).toEqual('');
    });

    it('should convert the generator name to title case', () => {
      expect(
        getGeneratorNameTitleCase({
          generatorName: 'my-awesome-generator',
          collectionName: 'my-awesome-collection',
          description: 'My cool description',
          options: [],
        })
      ).toEqual('My Awesome Generator');
    });

    it('should convert a single word to title case', () => {
      expect(
        getGeneratorNameTitleCase({
          generatorName: 'generator',
          collectionName: 'collection',
          description: 'A simple generator',
          options: [],
        })
      ).toEqual('Generator');
    });

    it('should convert single-letter words to title case', () => {
      expect(
        getGeneratorNameTitleCase({
          generatorName: 'a-b-c',
          collectionName: 'collection',
          description: 'A simple generator',
          options: [],
        })
      ).toEqual('A B C');
    });
  });

  describe('extractDefaultValue', () => {
    it('should return undefined if the option is undefined', () => {
      expect(extractDefaultValue(undefined)).toBeUndefined();
    });

    it('should return undefined if the default value is undefined', () => {
      expect(
        extractDefaultValue({
          name: 'Undefined',
          isRequired: false,
          aliases: [],
        })
      ).toBeUndefined();
    });

    it('should return a boolean value if the type is boolean', () => {
      expect(
        extractDefaultValue({
          name: 'Boolean',
          isRequired: false,
          aliases: [],
          type: 'boolean',
          default: 1,
        })
      ).toEqual(true);
      expect(
        extractDefaultValue({
          name: 'Boolean',
          isRequired: false,
          aliases: [],
          type: 'boolean',
          default: 0,
        })
      ).toEqual(false);
    });

    it('should return a stringified value if it is not a boolean', () => {
      expect(
        extractDefaultValue({
          name: 'Number',
          isRequired: false,
          aliases: [],
          default: 123,
        })
      ).toEqual('123');
    });
  });

  describe('compareWithDefaultValue', () => {
    it('should return true if both values are falsy', () => {
      expect(compareWithDefaultValue('', '')).toBe(true);
      expect(compareWithDefaultValue(false, false)).toBe(true);
      expect(compareWithDefaultValue(0, 0)).toBe(true);
      expect(compareWithDefaultValue(undefined, undefined)).toBe(true);
    });

    it('should return true if array values are in the same order', () => {
      expect(compareWithDefaultValue(['1', '2'], ['1', '2'])).toBe(true);
    });

    it('should return false if array values are not in the same order', () => {
      expect(compareWithDefaultValue(['1', '2'], ['2', '1'])).toBe(false);
    });

    it('should compare by equality', () => {
      expect(compareWithDefaultValue('abc', 'abc')).toBe(true);
      expect(compareWithDefaultValue(123, 123)).toBe(true);
      expect(compareWithDefaultValue(true, true)).toBe(true);
    });
  });

  describe('extractItemOptions', () => {
    it('should return an empty array if the option has no items', () => {
      expect(
        extractItemOptions({
          name: 'Empty',
          isRequired: false,
          aliases: [],
        })
      ).toEqual([]);
    });

    it('should return an array of option items', () => {
      expect(
        extractItemOptions({
          name: 'Items',
          isRequired: false,
          aliases: [],
          items: ['a', 'b', 'c'],
        })
      ).toEqual(['a', 'b', 'c']);
    });

    it('should return an array of option items enum', () => {
      expect(
        extractItemOptions({
          name: 'Items enum',
          isRequired: false,
          aliases: [],
          items: {
            type: OptionType.String,
            enum: ['a', 'b', 'c'],
          },
        })
      ).toEqual(['a', 'b', 'c']);
    });
  });
});
