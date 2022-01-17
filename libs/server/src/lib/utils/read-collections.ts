import { workspaceDependencies } from '@nx-console/npm';
import { CollectionInfo, Generator, GeneratorType } from '@nx-console/schema';
import { platform } from 'os';
import { dirname, join, resolve } from 'path';
import { clearJsonCache, readAndCacheJsonFile } from './utils';

export async function readCollections(
  workspacePath: string,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  if (clearPackageJsonCache) {
    clearJsonCache('package.json', workspacePath);
  }

  const packages = await workspaceDependencies(workspacePath);

  const collections = await Promise.all(
    packages.map(async (p) => {
      const { json } = await readAndCacheJsonFile(join(p, 'package.json'));
      return {
        packagePath: p,
        packageName: json.name,
        packageJson: json,
      };
    })
  );

  const allCollections = (
    await Promise.all(collections.map((c) => readCollection(c)))
  ).flat();

  /**
   * Since we gather all collections, and collections listed in `extends`, we need to dedupe collections here if workspaces have that extended collection in their own package.json
   */
  const dedupedCollections = new Map<string, CollectionInfo>();
  for (const singleCollection of allCollections) {
    if (!singleCollection) {
      continue;
    }

    if (!dedupedCollections.has(singleCollection.name)) {
      dedupedCollections.set(singleCollection.name, singleCollection);
    }
  }

  return Array.from(dedupedCollections.values());
}

async function readCollection({
  packagePath,
  packageName,
  packageJson: json,
}: {
  packagePath: string;
  packageName: string;
  packageJson: any;
}): Promise<CollectionInfo[] | null> {
  try {
    // const packageJson = await readAndCacheJsonFile(
    //   join(collectionName, 'package.json')
    // );

    const [executorCollections, generatorCollections] = await Promise.all([
      readAndCacheJsonFile(json.executors || json.builders, packagePath),
      readAndCacheJsonFile(json.generators || json.schematics, packagePath),
    ]);

    return getCollectionInfo(
      packageName,
      packagePath,
      executorCollections,
      generatorCollections
    );
  } catch (e) {
    return null;
  }
}

export async function getCollectionInfo(
  collectionName: string,
  collectionPath: string,
  executorCollection: { path: string; json: any },
  generatorCollection: { path: string; json: any }
): Promise<CollectionInfo[]> {
  const collectionMap: Map<string, CollectionInfo> = new Map();

  const buildCollectionInfo = (
    name: string,
    value: any,
    type: 'executor' | 'generator',
    schemaPath: string
  ): CollectionInfo => {
    let path = resolve(collectionPath, dirname(schemaPath), value.schema);

    if (platform() === 'win32') {
      path = `file:///${path.replace(/\\/g, '/')}`;
    }

    return {
      name: `${collectionName}:${name}`,
      type,
      path,
    };
  };

  const executors = {
    ...executorCollection.json.executors,
    ...executorCollection.json.builders,
  };
  for (const [key, schema] of Object.entries<any>(executors)) {
    if (!canUse(key, schema)) {
      continue;
    }
    const collectionInfo = buildCollectionInfo(
      key,
      schema,
      'executor',
      executorCollection.path
    );
    if (collectionMap.has(collectionInfo.name)) {
      continue;
    }
    collectionMap.set(collectionInfo.name, collectionInfo);
  }

  const generators = {
    ...generatorCollection.json.generators,
    ...generatorCollection.json.schematics,
  };
  for (const [key, schema] of Object.entries<any>(generators)) {
    if (!canUse(key, schema)) {
      continue;
    }

    try {
      const collectionInfo = buildCollectionInfo(
        key,
        schema,
        'generator',
        generatorCollection.path
      );
      collectionInfo.data = readCollectionGenerator(
        collectionName,
        key,
        schema
      );
      if (collectionMap.has(collectionInfo.name)) {
        continue;
      }
      collectionMap.set(collectionInfo.name, collectionInfo);
    } catch (e) {
      // noop - generator is invalid
    }
  }

  // TODO: check if the extended collection is read properly
  // if (
  //   generatorCollection.json.extends &&
  //   Array.isArray(generatorCollection.json.extends)
  // ) {
  //   const extendedSchema = generatorCollection.json.extends as string[];
  //   const extendedCollections = (
  //     await Promise.all(
  //       extendedSchema
  //         .filter((extended) => extended !== '@nrwl/workspace')
  //         .map((extended: string) => readCollections(extended))
  //     )
  //   )
  //     .flat()
  //     .filter((c): c is CollectionInfo => Boolean(c));

  //   for (const collection of extendedCollections) {
  //     if (collectionMap.has(collection.name)) {
  //       continue;
  //     }

  //     collectionMap.set(collection.name, collection);
  //   }
  // }

  return Array.from(collectionMap.values());
}

function readCollectionGenerator(
  collectionName: string,
  collectionSchemaName: string,
  collectionJson: any
): Generator | undefined {
  try {
    let generatorType: GeneratorType;
    switch (collectionJson['x-type']) {
      case 'application':
        generatorType = GeneratorType.Application;
        break;
      case 'library':
        generatorType = GeneratorType.Library;
        break;
      default:
        generatorType = GeneratorType.Other;
        break;
    }
    return {
      name: collectionSchemaName,
      collection: collectionName,
      description: collectionJson.description || '',
      type: generatorType,
    };
  } catch (e) {
    console.error(e);
    console.error(
      `Invalid package.json for schematic ${collectionName}:${collectionSchemaName}`
    );
  }
}

/**
 * Checks to see if the collection is usable within Nx Console.
 * @param name
 * @param s
 * @returns
 */
function canUse(
  name: string,
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
