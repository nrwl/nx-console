import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

export function projectNameAndRootProcessor(
  schema: GeneratorSchema
): GeneratorSchema {
  if (
    !schema?.options?.find(
      (option) => option.name === 'projectNameAndRootFormat'
    )
  ) {
    return schema;
  }
  return {
    ...schema,
    options: schema.options.filter(
      (option) => option.name !== 'projectNameAndRootFormat'
    ),
    context: {
      ...schema.context,
      fixedFormValues: {
        ...(schema.context?.fixedFormValues ?? {}),
        projectNameAndRootFormat: 'as-provided',
      },
    },
  };
}
