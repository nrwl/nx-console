import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { SchemaProcessor } from '../nx-console-plugin-types';
import { NxWorkspace } from '@nx-console/shared/types';

export const prefillProjectAndDirProcessor: SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  // before nx 17, path/directory options are inconsistent so we don't prefill project & directory simultaneously
  if (workspace.nxVersion.major < 17) {
    if (schema.context?.project) {
      schema.context.prefillValues = {
        ...(schema.context.prefillValues ?? {}),
        project: schema.context.project,
        projectName: schema.context.project,
        directory: '',
      };
    } else if (schema.context?.directory) {
      schema.context.prefillValues = {
        ...(schema.context.prefillValues ?? {}),
        directory: schema.context.directory,
      };
    }
  }

  // after nx 17, project option won't exist anymore and cwd-ing into directories will be the way to go

  if (schema.context?.directory) {
    schema.context.prefillValues = {
      ...(schema.context.prefillValues ?? {}),
      cwd: schema.context.directory,
    };
  }

  return schema;
};
