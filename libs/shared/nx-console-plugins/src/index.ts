import { NxConsolePluginsDefinition } from './lib/nx-console-plugin-types';
import { internalPlugins } from './lib/internal-plugins/index';
import { existsSync } from 'fs';

export { internalPlugins } from './lib/internal-plugins/index';
export * from './lib/nx-console-plugin-types';

export async function loadPlugins(
  workspacePath: string
): Promise<NxConsolePluginsDefinition> {
  let workspacePlugins: NxConsolePluginsDefinition | undefined = undefined;
  try {
    const pluginFile = `${workspacePath}/.nx/console/plugins.mjs`;
    if (!existsSync(pluginFile)) {
      workspacePlugins = undefined;
    }
    workspacePlugins = await import(pluginFile).then(
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
