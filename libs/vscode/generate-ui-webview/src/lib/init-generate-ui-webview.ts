import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { isProjectOption } from '@nx-console/shared/schema';
import { getNxWorkspaceProjects } from '@nx-console/vscode/nx-workspace';
import { selectGenerator } from '@nx-console/vscode/tasks';
import { ExtensionContext, Uri } from 'vscode';
import { GenerateUiWebview } from './generate-ui-webview';

let generateUIWebview: GenerateUiWebview;

export function initGenerateUiWebview(context: ExtensionContext) {
  generateUIWebview = new GenerateUiWebview(context);
}

export async function openGenerateUi(contextUri: Uri | undefined) {
  const deprecatedTaskExecutionSchema = await selectGenerator();
  if (!deprecatedTaskExecutionSchema) {
    return;
  }
  const generator: GeneratorSchema = {
    collectionName: deprecatedTaskExecutionSchema.collection ?? '',
    generatorName: deprecatedTaskExecutionSchema.name,
    description: deprecatedTaskExecutionSchema.description,
    options: deprecatedTaskExecutionSchema.options,
  };

  generateUIWebview.openGenerateUi(await augmentGeneratorSchema(generator));
}

async function augmentGeneratorSchema(
  generatorSchema: GeneratorSchema
): Promise<GeneratorSchema> {
  for (const option of generatorSchema.options) {
    if (isProjectOption(option)) {
      const projects = Object.entries(await getNxWorkspaceProjects());
      option.items = projects.map((entry) => entry[0]).sort();
    }
  }

  return generatorSchema;
}
