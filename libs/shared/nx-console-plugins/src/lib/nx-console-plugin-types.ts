import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { NxWorkspace } from '@nx-console/shared/types';

export type NxConsolePluginsDefinition = {
  schemaProcessors?: SchemaProcessor[];
  validators?: any[];
  startupMessages?: any[];
};

export type SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => GeneratorSchema;
