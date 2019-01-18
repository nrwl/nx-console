import { normalizeSchema } from '../utils';

export function schematicCollectionsForNgNew() {
  return [
    {
      name: '@schematics/angular',
      description: 'Default Angular CLI workspace',
      schema: normalizeSchema(require('@schematics/angular/ng-new/schema.json'))
    },
    {
      name: '@nrwl/schematics',
      description: 'Enterprise-ready Angular CLI workspace',
      schema: normalizeSchema(
        require('@nrwl/schematics/src/collection/ng-new/schema.json')
      )
    }
  ];
}
