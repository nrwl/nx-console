import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { existsSync } from 'fs';
import { nxWorkspace } from './workspace';
import { lspLogger } from '@nx-console/language-server/utils';

export async function getTransformedGeneratorSchema(
  workspacePath: string,
  schema: GeneratorSchema
): Promise<GeneratorSchema> {
  const plugins = await loadPlugins(workspacePath);
  lspLogger.log(JSON.stringify(plugins));
  const workspace = nxWorkspace(workspacePath);
  let modifiedSchema = schema;
  try {
    plugins?.schemaProcessors?.forEach((processor) => {
      modifiedSchema = processor(modifiedSchema, workspace);
    });
    return modifiedSchema;
  } catch (e) {
    lspLogger.log('error' + e);
    return modifiedSchema;
  }
}

async function loadPlugins(
  workspacePath: string
): Promise<
  | { schemaProcessors?: any[]; validators?: any[]; startupMessages?: any[] }
  | undefined
> {
  try {
    const pluginFile = `${workspacePath}/.nx/console/plugins.mjs`;
    if (!existsSync(pluginFile)) {
      return undefined;
    }
    return await import(pluginFile).then((module) => module.default);
  } catch (_) {
    return undefined;
  }
}
