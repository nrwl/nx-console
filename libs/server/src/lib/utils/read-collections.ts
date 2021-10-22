import { platform } from 'os';
import { dirname, join } from 'path';
import { CollectionInfo, Generator, GeneratorType } from '@nx-console/schema';
import { clearJsonCache, readAndCacheJsonFile } from './utils';

export async function readCollectionsFromNodeModules(
  workspaceJsonPath: string,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  const basedir = dirname(workspaceJsonPath);
  const nodeModulesDir = join(basedir, 'node_modules');

  if (clearPackageJsonCache) {
    clearJsonCache('package.json', basedir);
  }

  const packageJson = (await readAndCacheJsonFile('package.json', basedir))
    .json;
  const packages: { [packageName: string]: string } = {
    ...(packageJson.devDependencies || {}),
    ...(packageJson.dependencies || {}),
  };

  const collections = await Promise.all(
    Object.keys(packages).map(async (p) => {
      const json = await readAndCacheJsonFile(
        join(p, 'package.json'),
        nodeModulesDir
      );
      return {
        packageName: p,
        packageJson: json.json,
      };
    })
  );

  const allCollections = (
    await Promise.all(
      collections.map((c) => readCollections(nodeModulesDir, c.packageName))
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

    if (!dedupedCollections.has(singleCollection.name)) {
      dedupedCollections.set(singleCollection.name, singleCollection);
    }
  }

  return Array.from(dedupedCollections.values());
}

export async function readCollections(
  nodeModulesDir: string,
  collectionName: string
): Promise<CollectionInfo[] | null> {
  try {
    const packageJson = await readAndCacheJsonFile(
      join(collectionName, 'package.json'),
      nodeModulesDir
    );

    const [executorCollections, generatorCollections] = await Promise.all([
      readAndCacheJsonFile(
        packageJson.json.executors || packageJson.json.builders,
        dirname(packageJson.path)
      ),
      readAndCacheJsonFile(
        packageJson.json.generators || packageJson.json.schematics,
        dirname(packageJson.path)
      ),
    ]);

    return getCollectionInfo(
      collectionName,
      packageJson.path,
      nodeModulesDir,
      executorCollections.json,
      generatorCollections.json
    );
  } catch (e) {
    return null;
  }
}

export async function getCollectionInfo(
  collectionName: string,
  path: string,
  collectionDir: string,
  executorCollectionJson: any,
  generatorCollectionJson: any
): Promise<CollectionInfo[]> {
  const baseDir = dirname(path);

  const collectionMap: Map<string, CollectionInfo> = new Map();

  const buildCollectionInfo = (
    name: string,
    value: any,
    type: 'executor' | 'generator'
  ): CollectionInfo => {
    let path = '';
    if (platform() === 'win32') {
      path = `file:///${join(baseDir, value.schema).replace(/\\/g, '/')}`;
    } else {
      path = join(baseDir, value.schema);
    }

    return {
      name: `${collectionName}:${name}`,
      type,
      path,
    };
  };

  for (const [key, schema] of Object.entries<any>(
    executorCollectionJson.executors || executorCollectionJson.executors || {}
  )) {
    if (!canUse(key, schema)) {
      continue;
    }
    const collectionInfo = buildCollectionInfo(key, schema, 'executor');
    if (collectionMap.has(collectionInfo.name)) {
      continue;
    }
    collectionMap.set(collectionInfo.name, collectionInfo);
  }

  for (const [key, schema] of Object.entries<any>(
    generatorCollectionJson.generators ||
      generatorCollectionJson.schematics ||
      {}
  )) {
    if (!canUse(key, schema)) {
      continue;
    }

    try {
      const collectionInfo = buildCollectionInfo(key, schema, 'generator');
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

  if (
    generatorCollectionJson.extends &&
    Array.isArray(generatorCollectionJson.extends)
  ) {
    const extendedSchema = generatorCollectionJson.extends as string[];
    const extendedCollections = (
      await Promise.all(
        extendedSchema
          .filter((extended) => extended !== '@nrwl/workspace')
          .map((extended: string) => readCollections(collectionDir, extended))
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
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
