import {
  Generator,
  GeneratorType,
  Option,
  TaskExecutionSchema,
} from '@nx-console/schema';
import {
  getGenerators,
  normalizeSchema,
  readAndCacheJsonFile,
} from '@nx-console/server';
import { getNxConfig, nxWorkspace } from '@nx-console/vscode/nx-workspace';
import { dirname } from 'path';
import { QuickPickItem, window } from 'vscode';

async function readWorkspaceJsonDefaults(workspacePath: string): Promise<any> {
  const { json } = await nxWorkspace();

  let defaults = json.generators;

  if (!defaults) {
    try {
      /**
       * This could potentially fail if we're in an Angular CLI project without schematics being part of angular.json
       * Default the default to {} on the catch
       */
      defaults = (await getNxConfig(dirname(workspacePath))).generators || {};
    } catch (e) {
      defaults = {};
    }
  }

  const collectionDefaults = Object.keys(defaults).reduce(
    (collectionDefaultsMap: any, key) => {
      if (key.includes(':')) {
        const [collectionName, generatorName] = key.split(':');
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        collectionDefaultsMap[collectionName][generatorName] = defaults?.[key];
      } else {
        const collectionName = key;
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        Object.keys(defaults?.[collectionName] ?? {}).forEach(
          (generatorName) => {
            collectionDefaultsMap[collectionName][generatorName] =
              defaults?.[collectionName][generatorName];
          }
        );
      }
      return collectionDefaultsMap;
    },
    {}
  );
  return collectionDefaults;
}

export async function getGeneratorOptions(
  workspacePath: string,
  collectionName: string,
  generatorName: string,
  generatorPath: string
): Promise<Option[]> {
  const generatorSchema = await readAndCacheJsonFile(generatorPath);
  const workspaceDefaults = await readWorkspaceJsonDefaults(workspacePath);
  const defaults =
    workspaceDefaults &&
    workspaceDefaults[collectionName] &&
    workspaceDefaults[collectionName][generatorName];
  return await normalizeSchema(generatorSchema.json, defaults);
}

export async function selectGenerator(
  workspacePath: string,
  workspaceType: 'nx' | 'ng',
  generatorType?: GeneratorType,
  generator?: { collection: string; name: string }
): Promise<TaskExecutionSchema | undefined> {
  interface GenerateQuickPickItem extends QuickPickItem {
    collectionName: string;
    generator: Generator;
    collectionPath: string;
  }
  const { json } = await nxWorkspace();
  const generators = await getGenerators(workspacePath, json.projects);
  let generatorsQuickPicks = generators
    .filter((collection) => !!collection.data)
    .map((collection): GenerateQuickPickItem => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const generatorData = collection.data!;
      return {
        description: generatorData.description,
        label: `${generatorData.collection} - ${generatorData.name}`,
        collectionName: generatorData.collection,
        collectionPath: collection.path,
        generator: generatorData,
      };
    });

  if (generatorType) {
    generatorsQuickPicks = generatorsQuickPicks.filter((generator) => {
      return generator.generator.type === generatorType;
    });
  }

  if (generators) {
    const selection = generator
      ? generatorsQuickPicks.find(
          (quickPick) =>
            quickPick.generator.collection === generator.collection &&
            quickPick.generator.name === generator.name
        )
      : await window.showQuickPick(generatorsQuickPicks);
    if (selection) {
      const options =
        selection.generator.options ||
        (await getGeneratorOptions(
          workspacePath,
          selection.collectionName,
          selection.generator.name,
          selection.collectionPath
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
