import { clearJsonCache, readAndCacheJsonFile } from '@nx-console/server';
import { platform } from 'os';
import { dirname, join } from 'path';
import { CollectionInfo, Generator, GeneratorType } from '@nx-console/schema';

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

  const collectionMap = await Promise.all(
    collections.map((c) => readCollections(nodeModulesDir, c.packageName))
  );

  return collectionMap.flat().filter((c): c is CollectionInfo => Boolean(c));
}

export async function readCollections(
  basedir: string,
  collectionName: string
): Promise<CollectionInfo[] | null> {
  try {
    const packageJson = await readAndCacheJsonFile(
      join(collectionName, 'package.json'),
      basedir
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
      executorCollections.json,
      generatorCollections.json
    );
  } catch (e) {
    return null;
  }
}

export function getCollectionInfo(
  collectionName: string,
  path: string,
  executorCollectionJson: any,
  generatorCollectionJson: any
): CollectionInfo[] {
  const baseDir = dirname(path);

  const collection: CollectionInfo[] = [];

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

  for (const [key, value] of Object.entries<any>(
    executorCollectionJson.executors || executorCollectionJson.executors || {}
  )) {
    collection.push(buildCollectionInfo(key, value, 'executor'));
  }

  for (const [key, value] of Object.entries<any>(
    generatorCollectionJson.generators ||
      generatorCollectionJson.schematics ||
      {}
  )) {
    try {
      const collectionInfo = buildCollectionInfo(key, value, 'generator');
      collectionInfo.data = readCollectionGenerator(collectionName, key, value);
      collection.push(collectionInfo);
    } catch (e) {
      // noop - generator is invalid
    }
  }

  return collection;
}

function readCollectionGenerator(
  collectionName: string,
  collectionSchemaName: string,
  collectionJson: any
): Generator | undefined {
  try {
    if (canAdd(collectionSchemaName, collectionJson)) {
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
    }
  } catch (e) {
    console.error(e);
    console.error(
      `Invalid package.json for schematic ${collectionName}:${collectionSchemaName}`
    );
  }
}

function canAdd(
  name: string,
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
