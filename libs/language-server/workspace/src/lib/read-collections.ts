import {
  clearJsonCache,
  readAndCacheJsonFile,
} from '@nx-console/shared/file-system';
import {
  packageDetails,
  workspaceDependencies,
  workspaceDependencyPath,
} from '@nx-console/shared/npm';
import {
  CollectionInfo,
  ExecutorCollectionInfo,
  Generator,
  GeneratorCollectionInfo,
  GeneratorType,
} from '@nx-console/shared/schema';
import { platform } from 'os';
import { dirname, resolve } from 'path';
import { nxWorkspace } from './workspace';

export type ReadCollectionsOptions = {
  clearPackageJsonCache?: boolean;
  includeHidden?: boolean;
  includeNgAdd?: boolean;
};

export async function readCollections(
  workspacePath: string,
  options: ReadCollectionsOptions
): Promise<CollectionInfo[]> {
  if (options?.clearPackageJsonCache) {
    clearJsonCache('package.json', workspacePath);
  }

  const {
    workspace: { projects },
    nxVersion,
  } = await nxWorkspace(workspacePath);

  const packages = await workspaceDependencies(
    workspacePath,
    nxVersion,
    projects
  );

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

  const executors = {
    ...executorCollection.json.executors,
    ...executorCollection.json.builders,
  };
  for (const key of Object.keys(executors)) {
    let schema = executors[key];
    if (typeof schema === 'string') {
      schema = await resolveDelegatedExecutor(schema, workspacePath);
      if (!schema) {
        continue;
      }
    }

    if (!canUse(key, schema, options.includeHidden, options.includeNgAdd)) {
      continue;
    }
    const collectionInfo: ExecutorCollectionInfo = {
      type: 'executor',
      name: `${collectionName}:${key}`,
      schemaPath: formatCollectionPath(
        collectionPath,
        executorCollection.path,
        schema.schema
      ),
      implementationPath: formatCollectionPath(
        collectionPath,
        executorCollection.path,
        schema.implementation
      ),
      configPath: formatPath(resolve(collectionPath, executorCollection.path)),
    };
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
      const collectionInfo: GeneratorCollectionInfo = {
        type: 'generator',
        name: `${collectionName}:${key}`,
        schemaPath: formatCollectionPath(
          collectionPath,
          generatorCollection.path,
          schema.schema
        ),
        configPath: formatPath(
          resolve(collectionPath, generatorCollection.path)
        ),
        data: readCollectionGenerator(collectionName, key, schema),
      };
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
          .filter(
            (extended) =>
              extended !== '@nx/workspace' && extended !== '@nrwl/workspace'
          )
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
      aliases: collectionJson.aliases ?? [],
      type: generatorType,
    };
  } catch (e) {
    console.error(e);
    console.error(
      `Invalid package.json for schematic ${collectionName}:${collectionSchemaName}`
    );
  }
}

async function resolveDelegatedExecutor(
  delegatedExecutor: string,
  workspacePath: string
) {
  const [pkgName, executor] = delegatedExecutor.split(':');
  const dependencyPath = await workspaceDependencyPath(workspacePath, pkgName);

  if (!dependencyPath) {
    return null;
  }

  const {
    packageJson: { builders, executors },
    packagePath,
  } = await packageDetails(dependencyPath);

  const collection = await readAndCacheJsonFile(
    executors || builders,
    packagePath
  );

  if (!collection.json?.[executor]) {
    return null;
  }

  if (typeof collection.json[executor] === 'string') {
    return resolveDelegatedExecutor(collection.json[executor], workspacePath);
  }

  return collection.json[executor];
}

/**
 * Checks to see if the collection is usable within Nx Console.
 * @param name
 * @param s
 * @returns
 */
function canUse(
  name: string,
  s: {
    hidden: boolean;
    private: boolean;
    schema: string;
    extends: boolean;
    'x-deprecated'?: string;
  },
  includeHiddenCollections = false,
  includeNgAddCollection = false
): boolean {
  return (
    (!s.hidden || includeHiddenCollections) &&
    !s.private &&
    !s.extends &&
    !s['x-deprecated'] &&
    (name !== 'ng-add' || includeNgAddCollection)
  );
}

function collectionNameWithType(name: string, type: 'generator' | 'executor') {
  return `${name}-${type}`;
}

function formatCollectionPath(
  collectionPath: string,
  jsonFilePath: string,
  path: string
): string {
  return formatPath(resolve(collectionPath, dirname(jsonFilePath), path));
}

function formatPath(path: string): string {
  if (platform() === 'win32') {
    return `file:///${path.replace(/\\/g, '/')}`;
  }

  return path;
}
