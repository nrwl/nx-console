import { NxWorkspace } from '@nx-console/shared/types';
import {
  SchemaProcessor,
  StartupMessageFactory,
} from '../nx-console-plugin-types';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

export const nameAndDirectoryProcessor: SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  if (
    !schema?.options?.find((option) => option.name === 'nameAndDirectoryFormat')
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
          'x-hint':
            'You can provide a nested name instead of setting the directory option, e.g. my-dir/my-component',
        };
      }
      if (option.name === 'directory') {
        return {
          ...option,
          'x-priority': 'important',
        };
      }
      if (option.name === 'project') {
        return {
          ...option,
          'x-priority': undefined,
          tooltip:
            'When nameAndDirectoryFormat is set to as-provided, the project option will be ignored.',
        };
      }

      return option;
    }),
    context: {
      ...schema.context,
      prefillValues: {
        ...(schema.context?.prefillValues ?? {}),
        nameAndDirectoryFormat: 'as-provided',
      },
    },
  };
};

export const nameAndDirectoryStartupMessage: StartupMessageFactory = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  if (
    !schema?.options?.find((option) => option.name === 'nameAndDirectoryFormat')
  ) {
    return undefined;
  }

  return {
    message:
      'Starting with Nx 17, Nx Console will generate artifacts with the exact name and directory provided. Check the output files to make sure that they were created in the correct location. You can revert to the old behavior by updating the nameAndDirectoryFormat option below.',
    type: 'warning',
  };
};
