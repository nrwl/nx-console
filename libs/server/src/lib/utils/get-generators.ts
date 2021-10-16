import {
  Option,
  Generator,
  CollectionInfo,
  GeneratorType,
} from '@nx-console/schema';
import { basename, dirname, join } from 'path';

import {
  directoryExists,
  fileExistsSync,
  listFiles,
  normalizeSchema,
  readAndCacheJsonFile,
  toWorkspaceFormat,
} from './utils';
import {
  getCollectionInfo,
  readCollectionsFromNodeModules,
} from './read-collections';

export async function getGenerators(
  workspaceJsonPath: string,
  workspaceType: 'nx' | 'ng'
): Promise<CollectionInfo[]> {
  const basedir = join(workspaceJsonPath, '..');
  const collections = await readCollectionsFromNodeModules(
    workspaceJsonPath,
    false
  );
  let generatorCollections = collections.filter(
    (collection) => collection.type === 'generator'
  );

  generatorCollections = [
    ...generatorCollections,
    ...(await checkAndReadWorkspaceCollection(
      basedir,
      join('tools', 'schematics'),
      workspaceType
    )),
    ...(await checkAndReadWorkspaceCollection(
      basedir,
      join('tools', 'generators'),
      workspaceType
    )),
  ];
  return generatorCollections.filter(
    (collection): collection is CollectionInfo => !!collection.data
  );
}

async function checkAndReadWorkspaceCollection(
  basedir: string,
  workspaceGeneratorsPath: string,
  workspaceType: 'nx' | 'ng'
) {
  if (await directoryExists(join(basedir, workspaceGeneratorsPath))) {
    const collection = await readWorkspaceGeneratorsCollection(
      basedir,
      workspaceGeneratorsPath,
      workspaceType
    );
    return collection;
  }
  return Promise.resolve([]);
}

async function readWorkspaceJsonDefaults(
  workspaceJsonPath: string
): Promise<any> {
  const workspaceJson = await readAndCacheJsonFile(workspaceJsonPath);
  const defaults = toWorkspaceFormat(workspaceJson.json).generators || {};
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

async function readWorkspaceGeneratorsCollection(
  basedir: string,
  workspaceGeneratorsPath: string,
  workspaceType: 'nx' | 'ng'
): Promise<CollectionInfo[]> {
  const collectionDir = join(basedir, workspaceGeneratorsPath);
  const collectionName =
    workspaceType === 'nx' ? 'workspace-generator' : 'workspace-schematic';
  const collectionPath = join(collectionDir, 'collection.json');
  if (fileExistsSync(collectionPath)) {
    const collection = await readAndCacheJsonFile(
      'collection.json',
      collectionDir
    );

    return getCollectionInfo(
      collectionName,
      collectionPath,
      {},
      collection.json
    );
  } else {
    return await Promise.all(
      listFiles(collectionDir)
        .filter((f) => basename(f) === 'schema.json')
        .map(async (f) => {
          const schemaJson = await readAndCacheJsonFile(f, '');
          return {
            name: collectionName,
            type: 'generator',
            path: collectionDir,
            data: {
              name: schemaJson.json.id || schemaJson.json.$id,
              collection: collectionName,
              options: await normalizeSchema(schemaJson.json),
              description: '',
              type: GeneratorType.Other,
            },
          } as CollectionInfo;
        })
    );
  }
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
