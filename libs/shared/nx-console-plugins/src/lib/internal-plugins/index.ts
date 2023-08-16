import { NxConsolePluginsDefinition } from '../nx-console-plugin-types';
import { projectNameAndRootProcessor } from './project-name-and-root-processor';

export const internalPlugins: NxConsolePluginsDefinition = {
  schemaProcessors: [projectNameAndRootProcessor],
  validators: [],
  startupMessages: [],
};
