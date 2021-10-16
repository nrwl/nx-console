import { CollectionInfo, Generator, GeneratorType } from '@nx-console/schema';
import { TaskExecutionSchema } from '@nx-console/schema';
import { QuickPickItem, window } from 'vscode';
import { getGenerators, readGeneratorOptions } from './utils/get-generators';

export async function selectGenerator(
  workspaceJsonPath: string,
  workspaceType: 'nx' | 'ng',
  generatorType?: GeneratorType
): Promise<TaskExecutionSchema | undefined> {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    generator: Generator;
  }

  const generators = await getGenerators(workspaceJsonPath, workspaceType);
  let generatorsQuickPicks = generators
    .filter((c) => !!c.data)
    .map((c): GenerateQuickPickItem => {
      const generatorData = c.data!;
      return {
        description: generatorData.description,
        label: `${generatorData.collection} - ${generatorData.name}`,
        collectionName: generatorData.collection,
        generator: generatorData,
      };
    });

  if (generatorType) {
    generatorsQuickPicks = generatorsQuickPicks.filter((generator) => {
      return generator.generator.type === generatorType;
    });
  }

  if (generators) {
    const selection = await window.showQuickPick(generatorsQuickPicks);
    if (selection) {
      const options =
        selection.generator.options ||
        (await readGeneratorOptions(
          workspaceJsonPath,
          selection.collectionName,
          selection.generator.name
        ));
      const positional = `${selection.collectionName}:${selection.generator.name}`;
      return {
        ...selection.generator,
        options,
        command: 'generate',
        positional,
        cliName: 'nx',
      };
    }
  }
}
