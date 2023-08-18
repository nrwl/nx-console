import { NxConsolePluginsDefinition } from '../nx-console-plugin-types';
import { filterInternalAndDeprecatedProcessor } from './filter-internal-and-deprecated-processor';
import { projectNameAndRootProcessor } from './project-name-and-root-processor';
import { tempNoProjectAndDirProcessor } from './temp-no-project-and-dir-processor';

export const internalPlugins: NxConsolePluginsDefinition = {
  schemaProcessors: [
    projectNameAndRootProcessor,
    filterInternalAndDeprecatedProcessor,
    tempNoProjectAndDirProcessor,
  ],
  validators: [],
  startupMessages: [],
};
