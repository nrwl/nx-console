import { canAdd } from '../../src/api/read-schematic-collections';

describe('readAllSchematicCollections', () => {
  describe('canAdd', () => {
    const VALID_SCHEMATIC_TO_ADD = {
      private: false,
      hidden: false,
      schema: 'schema'
    };

    it('should include a valid schematic', () => {
      expect(canAdd('schematic-name', VALID_SCHEMATIC_TO_ADD)).toBe(true);
    });

    it('should filter out private schematics', () => {
      expect(
        canAdd('schematic-name', {
          ...VALID_SCHEMATIC_TO_ADD,
          private: true
        })
      ).toBe(false);
    });

    it('should filter out hidden schematics', () => {
      expect(
        canAdd('schematic-name', {
          ...VALID_SCHEMATIC_TO_ADD,
          hidden: true
        })
      ).toBe(false);
    });

    it('should filter out private schematics', () => {
      expect(
        canAdd('schematic-name', {
          ...VALID_SCHEMATIC_TO_ADD,
          private: true
        })
      ).toBe(false);
    });

    it('should filter out ng-add schematics', () => {
      expect(canAdd('ng-add', VALID_SCHEMATIC_TO_ADD)).toBe(false);
    });
  });
});
