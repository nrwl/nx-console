import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import { existsSync } from 'fs';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';
import {
  NxConsolePluginsDefinition,
  StartupMessageDefinition,
  internalPlugins,
} from '@nx-console/shared-nx-console-plugins';
import { consoleLogger } from '@nx-console/shared-utils';

export async function getTransformedGeneratorSchema(
  workspacePath: string,
  schema: GeneratorSchema,
): Promise<GeneratorSchema> {
  const plugins = await loadPlugins(workspacePath);
  const workspace = await nxWorkspace(workspacePath, consoleLogger);

  let modifiedSchema = schema;
  try {
    plugins?.schemaProcessors?.forEach((processor) => {
      modifiedSchema = processor(modifiedSchema, workspace, lspLogger);
    });
    return modifiedSchema;
  } catch (e) {
    lspLogger.log('error while applying schema processors' + e);
    return modifiedSchema;
  }
}

export async function getStartupMessage(
  workspacePath: string,
  schema: GeneratorSchema,
): Promise<StartupMessageDefinition | undefined> {
  const plugins = await loadPlugins(workspacePath);
  const workspace = await nxWorkspace(workspacePath, consoleLogger);

  let startupMessageDefinition: StartupMessageDefinition | undefined =
    undefined;
  try {
    for (const factory of plugins?.startupMessageFactories ?? []) {
      const def = await factory(schema, workspace, lspLogger);
      if (def) {
        startupMessageDefinition = def;
      }
    }

    return startupMessageDefinition;
  } catch (e) {
    lspLogger.log('error while getting startup message' + e);
    return startupMessageDefinition;
  }
}

async function loadPlugins(
  workspacePath: string,
): Promise<NxConsolePluginsDefinition> {
  let workspacePlugins: NxConsolePluginsDefinition | undefined = undefined;
  try {
    const pluginFile = `${workspacePath}/.nx/console/plugins.mjs`;
    if (!existsSync(pluginFile)) {
      workspacePlugins = undefined;
    }
    workspacePlugins = await import(pluginFile).then(
      (module) => module.default,
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
  };
}
