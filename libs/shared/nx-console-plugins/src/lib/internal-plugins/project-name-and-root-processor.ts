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
    options: schema.options
      .filter((option) => option.name !== 'projectNameAndRootFormat')
      .map((option) => {
        if (option.name === 'name') {
          return {
            ...option,
            'x-hint':
              "Starting with Nx 16.7, Nx Console will generate files with projectNameAndRootFormat: 'as-provided' set, meaning it generates the project with the exact name and directory provided.",
            'x-priority': 'important',
          };
        }
        if (option.name === 'directory') {
          return {
            ...option,
            'x-hint':
              "Starting with Nx 16.7, Nx Console will generate files with projectNameAndRootFormat: 'as-provided' set, meaning it generates the project with the exact name and directory provided.",
            'x-priority': 'important',
          };
        }

        return option;
      }),
    context: {
      ...schema.context,
      fixedFormValues: {
        ...(schema.context?.fixedFormValues ?? {}),
        projectNameAndRootFormat: 'as-provided',
      },
    },
  };
}
