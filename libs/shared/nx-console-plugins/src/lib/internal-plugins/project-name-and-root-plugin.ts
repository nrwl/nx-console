import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import {
  SchemaProcessor,
  StartupMessageFactory,
} from '../nx-console-plugin-types';
import { NxWorkspace } from '@nx-console/shared/types';
import { Logger } from '@nx-console/shared/schema';

export const projectNameAndRootProcessor: SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace,
  lspLogger: Logger
) => {
  if (
    !schema?.options?.find(
      (option) => option.name === 'projectNameAndRootFormat'
    )
  ) {
    return schema;
  }

  // TODO: remove any after update
  if (
    (workspace.workspace.workspaceLayout as any)?.projectNameAndRootFormat ===
    'derived'
  ) {
    return {
      ...schema,
      context: {
        ...schema.context,
        prefillValues: {
          ...(schema.context?.prefillValues ?? {}),
          projectNameAndRootFormat: 'derived',
        },
      },
    };
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
};

export const projectNameAndRootStartupMessage: StartupMessageFactory = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  if (
    !schema?.options?.find(
      (option) => option.name === 'projectNameAndRootFormat'
    )
  ) {
    return undefined;
  }
  // if they have explicitly set the option, we don't need to educate users about the change

  // TODO: remove any after update
  if ((workspace.workspace.workspaceLayout as any)?.projectNameAndRootFormat) {
    return undefined;
  }
  return {
    message:
      'Starting with Nx 16.7, Nx Console will generate projects with the exact name and directory provided. Check the output files to make sure that they were created in the correct location.',
    type: 'warning',
  };
};
