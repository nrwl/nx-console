import {
  CollectionInfo,
  GeneratorType,
  normalizeSchema,
  WorkspaceProjects,
} from '@nx-console/schema';
import { basename, join } from 'path';

import { getCollectionInfo, readCollections } from './read-collections';
import {
  directoryExists,
  fileExists,
  readAndCacheJsonFile,
  listFiles,
} from '@nx-console/file-system';

export async function getGenerators(
  workspacePath: string,
  projects?: WorkspaceProjects
): Promise<CollectionInfo[]> {
  const basedir = workspacePath;
  const collections = await readCollections(workspacePath, {
    projects,
    clearPackageJsonCache: false,
  });
  let generatorCollections = collections.filter(
    (collection) => collection.type === 'generator'
  );

  generatorCollections = [
    ...generatorCollections,
    ...(await checkAndReadWorkspaceGenerators(basedir, 'schematics')),
    ...(await checkAndReadWorkspaceGenerators(basedir, 'generators')),
  ];
  return generatorCollections.filter(
    (collection): collection is CollectionInfo => !!collection.data
  );
}

async function checkAndReadWorkspaceGenerators(
  basedir: string,
  workspaceGeneratorType: 'generators' | 'schematics'
) {
  const workspaceGeneratorsPath = join('tools', workspaceGeneratorType);
  if (await directoryExists(join(basedir, workspaceGeneratorsPath))) {
    const collection = await readWorkspaceGeneratorsCollection(
      basedir,
      workspaceGeneratorsPath,
      workspaceGeneratorType
    );
    return collection;
  }
  return Promise.resolve([]);
}

async function readWorkspaceGeneratorsCollection(
  basedir: string,
  workspaceGeneratorsPath: string,
  workspaceGeneratorType: 'generators' | 'schematics'
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
              options: await normalizeSchema(schemaJson.json, 'nx'),
              description: schemaJson.json.description ?? '',
              type,
            },
          } as CollectionInfo;
        })
    );
  }
}
