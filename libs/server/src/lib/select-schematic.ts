import { Schematic } from '@nx-console/schema';
import { TaskExecutionSchema } from '@nx-console/schema';
import { QuickPickItem, window } from 'vscode';
import {
  readAllSchematicCollections,
  readSchematicOptions,
} from './utils/read-schematic-collections';

export async function selectSchematic(
  workspaceJsonPath: string
): Promise<TaskExecutionSchema | undefined> {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    schematic: Schematic;
  }

  const schematics = (await readAllSchematicCollections(workspaceJsonPath))
    .filter((c) => c && c.schematics.length)
    .map((c): GenerateQuickPickItem[] =>
      c.schematics.map(
        (s: Schematic): GenerateQuickPickItem => ({
          description: s.description,
          label: `${c.name} - ${s.name}`,
          collectionName: c.name,
          schematic: s,
        })
      )
    )
    .flat();

  if (schematics) {
    const selection = await window.showQuickPick(schematics);
    if (selection) {
      const options =
        selection.schematic.options ||
        (await readSchematicOptions(
          workspaceJsonPath,
          selection.collectionName,
          selection.schematic.name
        ));
      const positional = `${selection.collectionName}:${selection.schematic.name}`;
      return {
        ...selection.schematic,
        options,
        command: 'generate',
        positional,
        cliName: 'nx',
      };
    }
  }
}
