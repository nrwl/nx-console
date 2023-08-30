import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

export function filterInternalAndDeprecatedProcessor(
  schema: GeneratorSchema
): GeneratorSchema {
  return {
    ...schema,
    options: (schema.options ?? []).filter((option) => {
      if (option['x-priority'] === 'internal') {
        return false;
      }
      if (option['x-deprecated']) {
        return false;
      }
      return true;
    }),
  };
}
