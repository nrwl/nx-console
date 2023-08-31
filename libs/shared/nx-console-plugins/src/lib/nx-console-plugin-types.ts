import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { NxWorkspace } from '@nx-console/shared/types';

export type NxConsolePluginsDefinition = {
  schemaProcessors?: SchemaProcessor[];
  validators?: any[];
  startupMessageFactories?: StartupMessageFactory[];
};

export type SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => GeneratorSchema;

export type StartupMessageDefinition = {
  message: string;
  type: 'warning' | 'error';
};

export type StartupMessageFactory = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) =>
  | StartupMessageDefinition
  | undefined
  | Promise<StartupMessageDefinition | undefined>;
