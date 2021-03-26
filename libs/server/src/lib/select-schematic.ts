import { Schematic } from '@nx-console/schema';
import { QuickPickItem, window } from 'vscode';
import { readAllSchematicCollections } from './utils/read-schematic-collections';

export async function selectSchematic(workspaceJsonPath: string) {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    schematic: Schematic;
  }

  const schematics = (await readAllSchematicCollections(workspaceJsonPath))
    .map((c): GenerateQuickPickItem[] =>
      c.schematics.map(
        (s): GenerateQuickPickItem => ({
          description: s.description,
          label: `${c.name} - ${s.name}`,
          collectionName: c.name,
          schematic: s,
        })
      )
    )
    .flat();

  return window.showQuickPick(schematics).then((selection) => {
    if (selection) {
      const schematic = `${selection.schematic.collection}:${selection.schematic.name}`;
      return {
        ...selection.schematic,
        command: 'generate',
        positional: schematic,
      };
    }
  });
}
