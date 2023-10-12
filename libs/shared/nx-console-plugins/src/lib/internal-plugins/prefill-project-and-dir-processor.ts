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
  // with nameAndDirectoryFormat, the project option is ignored, so we don't prefill it
  if (
    schema?.options?.find((option) => option.name === 'nameAndDirectoryFormat')
  ) {
    if (schema.context?.directory) {
      schema.context.prefillValues = {
        ...(schema.context.prefillValues ?? {}),
        directory: schema.context.directory,
      };
    }
  }

  // if we're >17 & without nameAndDirectoryFormat, we prefill all the info we have
  if (schema.context?.project) {
    schema.context.prefillValues = {
      ...(schema.context.prefillValues ?? {}),
      project: schema.context.project,
      projectName: schema.context.project,
    };
  }
  if (schema.context?.directory) {
    schema.context.prefillValues = {
      ...(schema.context.prefillValues ?? {}),
      directory: schema.context.directory,
    };
  }

  return schema;
};
