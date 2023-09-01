import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { StartupMessageFactory } from '../nx-console-plugin-types';

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
    options: schema.options.map((option) => {
      if (option.name === 'name') {
        return {
          ...option,
          'x-priority': 'important',
        };
      }
      if (option.name === 'directory') {
        return {
          ...option,
          'x-priority': 'important',
        };
      }

      return option;
    }),
    context: {
      ...schema.context,
      prefillValues: {
        ...(schema.context?.prefillValues ?? {}),
        projectNameAndRootFormat: 'as-provided',
      },
    },
  };
}

export const pluginNameAndRootStartupMessage: StartupMessageFactory = (
  schema: GeneratorSchema
) => {
  if (
    !schema?.options?.find(
      (option) => option.name === 'projectNameAndRootFormat'
    )
  ) {
    return undefined;
  }
  return {
    message:
      'Starting with Nx 16.7, Nx Console will generate projects with the exact name and directory provided. Check the output files to make sure that they were created in the correct location.',
    type: 'warning',
  };
};
