import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { existsSync } from 'fs';
import { nxWorkspace } from './workspace';
import { lspLogger } from '@nx-console/language-server/utils';
import {
  NxConsolePluginsDefinition,
  internalPlugins,
} from 'shared/nx-console-plugins';

export async function getTransformedGeneratorSchema(
  workspacePath: string,
  schema: GeneratorSchema
): Promise<GeneratorSchema> {
  const plugins = await loadPlugins(workspacePath);
  const workspace = await nxWorkspace(workspacePath);

  let modifiedSchema = schema;
  try {
    plugins?.schemaProcessors?.forEach((processor) => {
      modifiedSchema = processor(modifiedSchema, workspace);
    });
    return modifiedSchema;
  } catch (e) {
    lspLogger.log('error while applying schema processors' + e);
    return modifiedSchema;
  }
}

async function loadPlugins(
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
      ...(workspacePlugins?.schemaProcessors ?? []),
      ...(internalPlugins.schemaProcessors ?? []),
    ],
    validators: [
      ...(workspacePlugins?.validators ?? []),
      ...(internalPlugins.validators ?? []),
    ],
    startupMessages: [
      ...(workspacePlugins?.startupMessages ?? []),
      ...(internalPlugins.startupMessages ?? []),
    ],
  };
}
