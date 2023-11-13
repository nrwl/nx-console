import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { isProjectOption } from '@nx-console/shared/schema';
import { getGenerator } from '@nx-console/vscode/nx-cli-quickpicks';
import {
  getGeneratorContextV2,
  getNxWorkspaceProjects,
} from '@nx-console/vscode/nx-workspace';
import { ExtensionContext, Uri } from 'vscode';
import { registerGenerateCommands } from './generate-commands';
import { GenerateUiWebview } from './generate-ui-webview';

let generateUIWebview: GenerateUiWebview;

export async function initGenerateUiWebview(context: ExtensionContext) {
  generateUIWebview = new GenerateUiWebview(context);

  registerGenerateCommands(context);
}

export async function openGenerateUi(
  contextUri?: Uri,
  generatorName?: string,
  projectName?: string
) {
  const generator = await getGenerator(generatorName);
  if (!generator) {
    return;
  }

  let generatorContext = await getGeneratorContextV2(contextUri?.fsPath);

  if (projectName) {
    generatorContext = {
      ...generatorContext,
      project: projectName,
    };
  }

  generateUIWebview.openGenerateUi(
    await augmentGeneratorSchema({
      ...generator,
      context: generatorContext,
    })
  );
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
