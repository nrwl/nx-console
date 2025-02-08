import { NxConsolePluginsDefinition } from './lib/nx-console-plugin-types';
import { internalPlugins } from './lib/internal-plugins/index';
import { existsSync } from 'fs';
import { pathToFileURL } from "url"
import path from "path"

export { internalPlugins } from './lib/internal-plugins/index';
export * from './lib/nx-console-plugin-types';

export async function loadPlugins(
  workspacePath: string
): Promise<NxConsolePluginsDefinition> {
  let workspacePlugins: NxConsolePluginsDefinition | undefined = undefined;
  try {
    const pluginFileRelativePath = "/.nx/console/plugins.mjs";
    const pluginFileFullPath = path.join(workspacePath, pluginFileRelativePath)
    const pluginFilePath = pathToFileURL(pluginFileFullPath).href

    if (!existsSync(pluginFilePath)) {
      workspacePlugins = undefined;
    }
    workspacePlugins = await import(pluginFilePath).then(
      (module) => module.default
    );
  } catch (_) {
    workspacePlugins = undefined;
  }

  return {
    schemaProcessors: [
      ...(internalPlugins.schemaProcessors ?? []),
      ...(workspacePlugins?.schemaProcessors ?? []),
    ],
    validators: [
      ...(internalPlugins.validators ?? []),
      ...(workspacePlugins?.validators ?? []),
    ],
    startupMessageFactories: [
      ...(internalPlugins.startupMessageFactories ?? []),
      ...(workspacePlugins?.startupMessageFactories ?? []),
    ],
    projectViewItemProcessors: [
      ...(internalPlugins.projectViewItemProcessors ?? []),
      ...(workspacePlugins?.projectViewItemProcessors ?? []),      
    ]
  };
}
