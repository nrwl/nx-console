import {
  workspaceDependencies,
  workspaceDependencyPath,
  packageDetails,
} from '@nx-console/shared/npm';
import {
  CollectionInfo,
  Generator,
  GeneratorType,
} from '@nx-console/shared/schema';
import { platform } from 'os';
import { dirname, resolve } from 'path';
import {
  clearJsonCache,
  readAndCacheJsonFile,
} from '@nx-console/shared/file-system';
import { ReadCollectionsOptions } from '@nx-console/shared/collections';

export async function readCollections(
  workspacePath: string,
  options: ReadCollectionsOptions
): Promise<CollectionInfo[]> {
  if (options?.clearPackageJsonCache) {
    clearJsonCache('package.json', workspacePath);
  }

  const packages = await workspaceDependencies(workspacePath, options.projects);

  const collections = await Promise.all(
    packages.map(async (p) => {
      return await packageDetails(p);
    })
  );

  const allCollections = (
    await Promise.all(
      collections.map((c) => readCollection(workspacePath, c, options))
    )
  ).flat();

  /**
   * Since we gather all collections, and collections listed in `extends`, we need to dedupe collections here if workspaces have that extended collection in their own package.json
   */
  const dedupedCollections = new Map<string, CollectionInfo>();
  for (const singleCollection of allCollections) {
    if (!singleCollection) {
      continue;
    }

    if (
      !dedupedCollections.has(
        collectionNameWithType(singleCollection.name, singleCollection.type)
      )
    ) {
      dedupedCollections.set(
        collectionNameWithType(singleCollection.name, singleCollection.type),
        singleCollection
      );
    }
  }

  return Array.from(dedupedCollections.values());
}

async function readCollection(
  workspacePath: string,
  {
    packagePath,
    packageName,
    packageJson: json,
  }: {
    packagePath: string;
    packageName: string;
    packageJson: any;
  },
  options: ReadCollectionsOptions
): Promise<CollectionInfo[] | null> {
  try {
    const [executorCollections, generatorCollections] = await Promise.all([
      readAndCacheJsonFile(json.executors || json.builders, packagePath),
      readAndCacheJsonFile(json.generators || json.schematics, packagePath),
    ]);

    return getCollectionInfo(
      workspacePath,
      packageName,
      packagePath,
      executorCollections,
      generatorCollections,
      options
    );
  } catch (e) {
    return null;
  }
}

export async function getCollectionInfo(
  workspacePath: string,
  collectionName: string,
  collectionPath: string,
  executorCollection: { path: string; json: any },
  generatorCollection: { path: string; json: any },
  options: ReadCollectionsOptions
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
    if (!canUse(key, schema, options.includeHidden, options.includeNgAdd)) {
      continue;
    }
    const collectionInfo = buildCollectionInfo(
      key,
      schema,
      'executor',
      executorCollection.path
    );
    if (
      collectionMap.has(collectionNameWithType(collectionInfo.name, 'executor'))
    ) {
      continue;
    }
    collectionMap.set(
      collectionNameWithType(collectionInfo.name, 'executor'),
      collectionInfo
    );
  }

  const generators = {
    ...generatorCollection.json.generators,
    ...generatorCollection.json.schematics,
  };
  for (const [key, schema] of Object.entries<any>(generators)) {
    if (!canUse(key, schema, options.includeHidden, options.includeNgAdd)) {
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
      if (
        collectionMap.has(
          collectionNameWithType(collectionInfo.name, 'generator')
        )
      ) {
        continue;
      }
      collectionMap.set(
        collectionNameWithType(collectionInfo.name, 'generator'),
        collectionInfo
      );
    } catch (e) {
      // noop - generator is invalid
    }
  }

  if (
    generatorCollection.json.extends &&
    Array.isArray(generatorCollection.json.extends)
  ) {
    const extendedSchema = generatorCollection.json.extends as string[];
    const extendedCollections = (
      await Promise.all(
        extendedSchema
          .filter((extended) => extended !== '@nrwl/workspace')
          .map(async (extended: string) => {
            const dependencyPath = await workspaceDependencyPath(
              workspacePath,
              extended
            );

            if (!dependencyPath) {
              return null;
            }

            return readCollection(
              workspacePath,
              await packageDetails(dependencyPath),
              options
            );
          })
      )
    )
      .flat()
      .filter((c): c is CollectionInfo => Boolean(c));

    for (const collection of extendedCollections) {
      if (collectionMap.has(collection.name)) {
        continue;
      }

      collectionMap.set(collection.name, collection);
    }
  }

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
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean },
  includeHiddenCollections = false,
  includeNgAddCollection = false
): boolean {
  return (
    (!s.hidden || includeHiddenCollections) &&
    !s.private &&
    !s.extends &&
    (name !== 'ng-add' || includeNgAddCollection)
  );
}

function collectionNameWithType(name: string, type: 'generator' | 'executor') {
  return `${name}-${type}`;
}
