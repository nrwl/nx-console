import { Generator, GeneratorType } from '@nx-console/schema';
import { TaskExecutionSchema } from '@nx-console/schema';
import { QuickPickItem, window } from 'vscode';
import {
  readAllGeneratorCollections,
  readGeneratorOptions,
} from './utils/read-generator-collections';

export async function selectGenerator(
  workspaceJsonPath: string,
  generatorType?: GeneratorType
): Promise<TaskExecutionSchema | undefined> {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    generator: Generator;
  }

  let generators = (await readAllGeneratorCollections(workspaceJsonPath))
    .filter((c) => c && c.generators.length)
    .map((c): GenerateQuickPickItem[] =>
      c.generators.map(
        (s: Generator): GenerateQuickPickItem => ({
          description: s.description,
          label: `${c.name} - ${s.name}`,
          collectionName: c.name,
          generator: s,
        })
      )
    )
    .flat();

  if (generatorType) {
    generators = generators.filter((generator) => {
      return generator.generator.type === generatorType;
    });
  }

  if (generators) {
    const selection = await window.showQuickPick(generators);
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
