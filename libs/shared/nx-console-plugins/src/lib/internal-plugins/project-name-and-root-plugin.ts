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

  const pnarfDefault = schema.options.find(
    (opt) => opt.name === 'projectNameAndRootFormat'
  )?.default;
  return {
    ...schema,
    options: schema.options.map((option) => {
      if (option.name === 'name') {
        return {
          ...option,
          'x-priority': 'important',
          'x-hint':
            'You can provide a nested name instead of setting the directory option, e.g. my-dir/my-app',
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
        projectNameAndRootFormat: pnarfDefault
          ? `${pnarfDefault}`
          : 'as-provided',
      },
    },
  };
};

export const projectNameAndRootStartupMessage: StartupMessageFactory = (
  schema: GeneratorSchema,
  workspace: NxWorkspace,
  lspLogger: Logger
) => {
  if (workspace.nxVersion.major > 17) {
    return undefined;
  }
  if (
    !schema?.options?.find(
      (option) => option.name === 'projectNameAndRootFormat'
    )
  ) {
    return undefined;
  }
  if ((workspace.workspace.workspaceLayout as any)?.projectNameAndRootFormat) {
    return undefined;
  }
  return {
    message:
      'Starting with Nx 16.7, Nx Console will generate projects with the exact name and directory provided. Check the output files to make sure that they were created in the correct location.',
    type: 'warning',
  };
};
