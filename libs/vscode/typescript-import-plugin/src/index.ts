import type ts from 'typescript/lib/tsserverlibrary';
import { Logger } from './lib/logger';
import {
  NxImportsPlugin,
  type Configuration,
} from './lib/typescript-import-plugin';

const init: ts.server.PluginModuleFactory = ({ typescript }) => {
  let logger: Logger | undefined;
  const nxImportsPlugin = new NxImportsPlugin(typescript);

  return {
    create(info: ts.server.PluginCreateInfo) {
      logger = Logger.create(info);
      logger.log('create');
      nxImportsPlugin.logger = logger;

      if (Object.keys(info.config).length > 0) {
        nxImportsPlugin.setConfig(info.config);
      }
      nxImportsPlugin.addProject(info.project);

      return nxImportsPlugin.decorate(info.languageService);
    },
    onConfigurationChanged(config: Configuration) {
      logger?.log('onConfigurationChanged called, ' + JSON.stringify(config));
      nxImportsPlugin.setConfig(config);
    },
  };
};

export = init;
