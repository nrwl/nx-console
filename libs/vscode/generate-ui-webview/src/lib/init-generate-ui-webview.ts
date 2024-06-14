import { getGenerator } from '@nx-console/vscode/nx-cli-quickpicks';
import { getGeneratorContextV2 } from '@nx-console/vscode/nx-workspace';
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

  generateUIWebview.openGenerateUi({
    ...generator,
    context: generatorContext,
  });
}
