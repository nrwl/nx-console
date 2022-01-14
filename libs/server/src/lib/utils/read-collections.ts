import { CollectionInfo, Generator, GeneratorType } from '@nx-console/schema';
import { platform } from 'os';
import { dirname, join, resolve } from 'path';
import { isWorkspaceInPnp, pnpApi, pnpWorkspaceDependencies } from './pnp';
import {
  clearJsonCache,
  listOfUnnestedNpmPackages,
  readAndCacheJsonFile,
} from './utils';

export async function readCollectionsFromNodeModules(
  workspacePath: string,
  clearPackageJsonCache: boolean
): Promise<CollectionInfo[]> {
  const nodeModulesDir = join(workspacePath, 'node_modules');

  if (clearPackageJsonCache) {
    clearJsonCache('package.json', workspacePath);
  }

  if (await isWorkspaceInPnp(workspacePath)) {
    const pnp_module = await pnpWorkspaceDependencies(workspacePath);
  }

  const packages = await listOfUnnestedNpmPackages(nodeModulesDir);

  const collections = await Promise.all(
    packages.map(async (p) => {
      const { json } = await readAndCacheJsonFile(
        join(p, 'package.json'),
        nodeModulesDir
      );
      return {
        packageName: p,
        packageJson: json,
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
      executorCollections,
      generatorCollections
    );
  } catch (e) {
    return null;
  }
}

export async function getCollectionInfo(
  collectionName: string,
  path: string,
  collectionDir: string,
  executorCollection: { path: string; json: any },
  generatorCollection: { path: string; json: any }
): Promise<CollectionInfo[]> {
  const baseDir = dirname(path);

  const collectionMap: Map<string, CollectionInfo> = new Map();

  const buildCollectionInfo = (
    name: string,
    value: any,
    type: 'executor' | 'generator',
    schemaPath: string
  ): CollectionInfo => {
    let path = resolve(baseDir, dirname(schemaPath), value.schema);

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

  if (
    generatorCollection.json.extends &&
    Array.isArray(generatorCollection.json.extends)
  ) {
    const extendedSchema = generatorCollection.json.extends as string[];
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
