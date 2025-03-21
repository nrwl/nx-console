import { lspLogger } from '@nx-console/language-server-utils';
import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import {
  StartupMessageDefinition,
  loadPlugins,
} from '@nx-console/shared-nx-console-plugins';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
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
