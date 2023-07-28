import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { isProjectOption } from '@nx-console/shared/schema';
import { selectGenerator } from '@nx-console/vscode/nx-cli-quickpicks';
import {
  getGeneratorContextV2,
  getGeneratorOptions,
  getGenerators,
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

  let generatorContext = contextUri
    ? await getGeneratorContextV2(contextUri.fsPath)
    : {};

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

async function getGenerator(
  generatorName?: string
): Promise<GeneratorSchema | undefined> {
  if (generatorName) {
    const generatorInfo = {
      collection: generatorName.split(':')[0],
      name: generatorName.split(':')[1],
    };
    const foundGenerator = (await getGenerators()).find(
      (gen) =>
        generatorInfo.collection === gen.data?.collection &&
        generatorInfo.name === gen.data?.name
    );
    if (foundGenerator) {
      const options = await getGeneratorOptions({
        collection: generatorInfo.collection,
        name: generatorInfo.name,
        path: foundGenerator.path,
      });
      return {
        collectionName: foundGenerator.data?.collection ?? '',
        generatorName: foundGenerator.data?.name ?? '',
        description: foundGenerator.data?.description ?? '',
        options: options ?? [],
      };
    }
  }

  const deprecatedTaskExecutionSchema = await selectGenerator();
  if (!deprecatedTaskExecutionSchema) {
    return;
  }

  return {
    collectionName: deprecatedTaskExecutionSchema.collection ?? '',
    generatorName: deprecatedTaskExecutionSchema.name,
    description: deprecatedTaskExecutionSchema.description,
    options: deprecatedTaskExecutionSchema.options,
  };
}
