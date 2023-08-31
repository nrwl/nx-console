import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { SchemaProcessor } from '../nx-console-plugin-types';

export const prefillProjectAndDirProcessor: SchemaProcessor = (
  schema: GeneratorSchema
) => {
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
  return schema;
};
