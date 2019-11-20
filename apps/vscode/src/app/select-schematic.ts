import { Schematic } from '@angular-console/schema';
import { readAllSchematicCollections } from '@angular-console/server';
import { QuickPickItem, window } from 'vscode';

export function selectSchematic(workspacePath: string) {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    schematic: Schematic;
  }

  const schematics = readAllSchematicCollections(
    workspacePath,
    'tools/schematics', // TODO: Make these values auto detectable / configurable
    'workspace-schematic' // TODO: Make these values auto detectable / configurable
  )
    .map((c): GenerateQuickPickItem[] =>
      c.schematics.map(
        (s): GenerateQuickPickItem => ({
          description: s.description,
          label: `${c.name} - ${s.name}`,
          collectionName: c.name,
          schematic: s
        })
      )
    )
    .flat();

  return window.showQuickPick(schematics).then(selection => {
    if (selection) {
      const schematic = `${selection.schematic.collection}:${selection.schematic.name}`;
      return {
        ...selection.schematic,
        command: 'generate',
        positional: schematic
      };
    }
  });
}
