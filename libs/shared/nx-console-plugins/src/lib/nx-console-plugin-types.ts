import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import { Logger } from '@nx-console/shared-schema';
import { NxWorkspace } from '@nx-console/shared-types';

export type NxConsolePluginsDefinition = {
  schemaProcessors?: SchemaProcessor[];
  validators?: any[];
  startupMessageFactories?: StartupMessageFactory[];
  projectViewItemProcessors?: ProjectViewItemProcessor[];
};

export type SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace,
  lspLogger: Logger
) => GeneratorSchema;

export type StartupMessageDefinition = {
  message: string;
  type: 'warning' | 'error';
};

export type StartupMessageFactory = (
  schema: GeneratorSchema,
  workspace: NxWorkspace,
  lspLogger: Logger
) =>
  | StartupMessageDefinition
  | undefined
  | Promise<StartupMessageDefinition | undefined>;

export type ProjectViewItemProcessor = (
  schema: ProjectViewItem,
  workspace: NxWorkspace
) => ProjectViewItem;

export type ProjectViewItem = {
  description?: string | boolean,
  // this throws a ts error: Type 'string | MarkdownString' is not assignable to type 'string'
  // tooltip?: string
}