import { NxConsolePluginsDefinition } from '../nx-console-plugin-types';
import { filterInternalAndDeprecatedProcessor } from './filter-internal-and-deprecated-processor';
import { gitCleanMessageFactory } from './git-clean-message-factory';
import { prefillProjectAndDirProcessor } from './prefill-project-and-dir-processor';
import {
  pluginNameAndRootStartupMessage,
  projectNameAndRootProcessor,
} from './project-name-and-root-plugin';

export const internalPlugins: NxConsolePluginsDefinition = {
  schemaProcessors: [
    projectNameAndRootProcessor,
    filterInternalAndDeprecatedProcessor,
    prefillProjectAndDirProcessor,
  ],
  validators: [],
  startupMessageFactories: [
    gitCleanMessageFactory,
    pluginNameAndRootStartupMessage,
  ],
};
