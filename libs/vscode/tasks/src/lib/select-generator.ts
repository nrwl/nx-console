import {
  CollectionInfo,
  Generator,
  GeneratorType,
  Option,
  TaskExecutionSchema,
} from '@nx-console/schema';
import { QuickPickItem, window } from 'vscode';
import {
  getGenerators,
  normalizeSchema,
  readAndCacheJsonFile,
} from '@nx-console/server';
import { getNxConfig } from '@nx-console/vscode/nx-workspace';
import { dirname, join } from 'path';

async function readWorkspaceJsonDefaults(
  workspaceJsonPath: string
): Promise<any> {
  const workspaceJson = await readAndCacheJsonFile(workspaceJsonPath);
  let defaults = workspaceJson.json.schematics || workspaceJson.json.generators;

  if (!defaults) {
    try {
      /**
       * This could potentially fail if we're in an Angular CLI project without schematics being part of angular.json
       * Default the default to {} on the catch
       */
      defaults =
        (await getNxConfig(dirname(workspaceJsonPath))).generators || {};
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
        collectionDefaultsMap[collectionName][generatorName] = defaults[key];
      } else {
        const collectionName = key;
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        Object.keys(defaults[collectionName]).forEach((generatorName) => {
          collectionDefaultsMap[collectionName][generatorName] =
            defaults[collectionName][generatorName];
        });
      }
      return collectionDefaultsMap;
    },
    {}
  );
  return collectionDefaults;
}

export async function readGeneratorOptions(
  workspaceJsonPath: string,
  collectionName: string,
  generatorName: string
): Promise<Option[]> {
  const basedir = join(workspaceJsonPath, '..');
  const nodeModulesDir = join(basedir, 'node_modules');
  const collectionPackageJson = await readAndCacheJsonFile(
    join(collectionName, 'package.json'),
    nodeModulesDir
  );
  const collectionJson = await readAndCacheJsonFile(
    collectionPackageJson.json.schematics ||
      collectionPackageJson.json.generators,
    dirname(collectionPackageJson.path)
  );
  const generators = Object.assign(
    {},
    collectionJson.json.schematics,
    collectionJson.json.generators
  );

  const generatorSchema = await readAndCacheJsonFile(
    generators[generatorName].schema,
    dirname(collectionJson.path)
  );
  const workspaceDefaults = await readWorkspaceJsonDefaults(workspaceJsonPath);
  const defaults =
    workspaceDefaults &&
    workspaceDefaults[collectionName] &&
    workspaceDefaults[collectionName][generatorName];
  return await normalizeSchema(generatorSchema.json, defaults);
}

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
    .map((c) => c.data)
    .filter(
      (generator: Generator | undefined): generator is Generator => !!generator
    )
    .map((generatorData): GenerateQuickPickItem => {
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
