import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

// THIS IS A FIX UNTIL DIR & PATH OPTIONS ARE PROPERLY HANDLED
// WE DON'T WANT TO PREFILL DIR WHEN THERE'S A PROJECT
export function tempNoProjectAndDirProcessor(
  schema: GeneratorSchema
): GeneratorSchema {
  if (!schema.options.find((opt) => opt.name === 'project')) {
    return schema;
  }
  return {
    ...schema,
    context: {
      ...(schema.context ?? {}),
      directory: undefined,
    },
  };
}
