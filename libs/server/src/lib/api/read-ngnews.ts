import { normalizeSchema } from '../utils/utils';

export function schematicCollectionsForNgNew() {
  return [
    {
      name: '@schematics/angular',
      description: 'Default Angular CLI workspace',
      schema: normalizeSchema(require('@schematics/angular/ng-new/schema.json'))
    },
    {
      name: '@nrwl/workspace',
      description: 'Angular CLI power-ups for modern development',
      schema: normalizeSchema(
        require('@nrwl/workspace/src/schematics/ng-new/schema.json')
      )
    }
  ];
}
