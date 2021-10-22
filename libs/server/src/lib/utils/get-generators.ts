import { CollectionInfo, GeneratorType } from '@nx-console/schema';
import { basename, join } from 'path';

import {
  directoryExists,
  fileExistsSync,
  listFiles,
  normalizeSchema,
  readAndCacheJsonFile,
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
    ...(await checkAndReadWorkspaceGenerators(
      basedir,
      join('tools', 'schematics'),
      workspaceType
    )),
    ...(await checkAndReadWorkspaceGenerators(
      basedir,
      join('tools', 'generators'),
      workspaceType
    )),
  ];
  return generatorCollections.filter(
    (collection): collection is CollectionInfo => !!collection.data
  );
}

async function checkAndReadWorkspaceGenerators(
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
      collectionDir,
      {},
      collection.json
    );
  } else {
    return await Promise.all(
      listFiles(collectionDir)
        .filter((f) => basename(f) === 'schema.json')
        .map(async (f) => {
          const schemaJson = await readAndCacheJsonFile(f, '');
          const name = schemaJson.json.id || schemaJson.json.$id;
          return {
            name: collectionName,
            type: 'generator',
            path: collectionDir,
            data: {
              name,
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
