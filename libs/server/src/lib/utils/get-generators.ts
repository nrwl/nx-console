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
  workspaceJsonPath: string
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
      join('tools', 'schematics')
    )),
    ...(await checkAndReadWorkspaceGenerators(
      basedir,
      join('tools', 'generators')
    )),
  ];
  return generatorCollections.filter(
    (collection): collection is CollectionInfo => !!collection.data
  );
}

async function checkAndReadWorkspaceGenerators(
  basedir: string,
  workspaceGeneratorsPath: string
) {
  if (await directoryExists(join(basedir, workspaceGeneratorsPath))) {
    const collection = await readWorkspaceGeneratorsCollection(
      basedir,
      workspaceGeneratorsPath
    );
    return collection;
  }
  return Promise.resolve([]);
}

async function readWorkspaceGeneratorsCollection(
  basedir: string,
  workspaceGeneratorsPath: string
): Promise<CollectionInfo[]> {
  const collectionDir = join(basedir, workspaceGeneratorsPath);
  const collectionName = 'workspace-generator';
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
      {
        path: collectionPath,
        json: {},
      },
      collection.json
    );
  } else {
    return await Promise.all(
      listFiles(collectionDir)
        .filter((f) => basename(f) === 'schema.json')
        .map(async (f) => {
          const schemaJson = await readAndCacheJsonFile(f, '');
          const name = schemaJson.json.id || schemaJson.json.$id;
          const type: GeneratorType =
            schemaJson.json['x-type'] ?? GeneratorType.Other;
          return {
            name: collectionName,
            type: 'generator',
            path: collectionDir,
            data: {
              name,
              collection: collectionName,
              options: await normalizeSchema(schemaJson.json),
              description: '',
              type,
            },
          } as CollectionInfo;
        })
    );
  }
}
