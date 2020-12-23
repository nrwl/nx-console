import { Generator } from '@nx-console/schema';
import { readAllGeneratorCollections } from '@nx-console/server';
import { QuickPickItem, window } from 'vscode';
import { join } from 'path';

export async function selectGenerator(workspaceJsonPath: string) {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    generator: Generator;
  }

  const schematics = (await readAllGeneratorCollections(
    workspaceJsonPath,
    join('tools', 'schematics')
  ))
    .map((c): GenerateQuickPickItem[] =>
      c.generators.map(
        (g): GenerateQuickPickItem => ({
          description: g.description,
          label: `${c.name} - ${g.name}`,
          collectionName: c.name,
          generator: g
        })
      )
    )
    .flat();

  return window.showQuickPick(schematics).then(selection => {
    if (selection) {
      const schematic = `${selection.generator.collection}:${selection.generator.name}`;
      return {
        ...selection.generator,
        command: 'generate',
        positional: schematic
      };
    }
  });
}
