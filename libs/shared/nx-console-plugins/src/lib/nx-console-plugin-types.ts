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
  item: any, // this is NxTreeItem but figuring out the dependency graph is too tricky
  workspace: NxWorkspace
) => ProjectViewTreeItem;

// these are the attributes you can override for now
export type ProjectViewTreeItem = {
  label?: string;
  description?: string;
  tooltip?: string;
  iconPath?: string;
};
