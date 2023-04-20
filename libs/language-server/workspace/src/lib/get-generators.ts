import { NxGeneratorsRequestOptions } from '@nx-console/language-server/types';
import {
  directoryExists,
  fileExists,
  listFiles,
  readAndCacheJsonFile,
} from '@nx-console/shared/file-system';
import { CollectionInfo, GeneratorType } from '@nx-console/shared/schema';
import { normalizeSchema } from '@nx-console/shared/schema/normalize';
import { basename, join } from 'path';
import { getCollectionInfo, readCollections } from './read-collections';

export async function getGenerators(
  workspacePath: string,
  options: NxGeneratorsRequestOptions = {
    includeHidden: false,
    includeNgAdd: false,
  }
): Promise<CollectionInfo[]> {
  const basedir = workspacePath;
  const collections = await readCollections(workspacePath, {
    clearPackageJsonCache: false,
    includeHidden: options.includeHidden,
    includeNgAdd: options.includeNgAdd,
  });
  let generatorCollections = collections.filter(
    (collection) => collection.type === 'generator'
  );

  generatorCollections = [
    ...generatorCollections,
    ...(await checkAndReadWorkspaceGenerators(basedir, 'schematics', options)),
    ...(await checkAndReadWorkspaceGenerators(basedir, 'generators', options)),
  ];
  return generatorCollections.filter(
    (collection): collection is CollectionInfo => !!collection.data
  );
}

async function checkAndReadWorkspaceGenerators(
  basedir: string,
  workspaceGeneratorType: 'generators' | 'schematics',
  options: NxGeneratorsRequestOptions
) {
  const workspaceGeneratorsPath = join('tools', workspaceGeneratorType);
  if (await directoryExists(join(basedir, workspaceGeneratorsPath))) {
    const collection = await readWorkspaceGeneratorsCollection(
      basedir,
      workspaceGeneratorsPath,
      workspaceGeneratorType,
      options
    );
    return collection;
  }
  return Promise.resolve([]);
}

async function readWorkspaceGeneratorsCollection(
  basedir: string,
  workspaceGeneratorsPath: string,
  workspaceGeneratorType: 'generators' | 'schematics',
  options: NxGeneratorsRequestOptions
): Promise<CollectionInfo[]> {
  const collectionDir = join(basedir, workspaceGeneratorsPath);
  const collectionName = `workspace-${
    workspaceGeneratorType === 'generators' ? 'generator' : 'schematic'
  }`;
  const collectionPath = join(collectionDir, 'collection.json');
  if (await fileExists(collectionPath)) {
    const collection = await readAndCacheJsonFile(
      `${collectionDir}/collection.json`
    );

    return getCollectionInfo(
      basedir,
      collectionName,
      collectionPath,
      {
        path: collectionPath,
        json: {},
      },
      collection.json,
      options
    );
  } else {
    return await Promise.all(
      listFiles(collectionDir)
        .filter((f) => basename(f) === 'schema.json')
        .map(async (schemaJsonPath) => {
          const schemaJson = await readAndCacheJsonFile(schemaJsonPath, '');
          const name = schemaJson.json.id || schemaJson.json.$id;
          const type: GeneratorType =
            schemaJson.json['x-type'] ?? GeneratorType.Other;
          return {
            name: collectionName,
            type: 'generator',
            path: schemaJsonPath,
            data: {
              name,
              collection: collectionName,
              options: await normalizeSchema(schemaJson.json),
              description: schemaJson.json.description ?? '',
              type,
            },
          } as CollectionInfo;
        })
    );
  }
}
