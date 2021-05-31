/* eslint-disable @typescript-eslint/no-explicit-any */
import { clearJsonCache, readAndCacheJsonFile } from '@nx-console/server';
import { dirname, join } from 'path';

export interface ExecutorInfo {
  name: string;
  path: string;
}

export function getAllExecutors(
  workspaceJsonPath: string,
  clearPackageJsonCache: boolean
): ExecutorInfo[] {
  return readExecutorCollectionsFromNodeModules(
    workspaceJsonPath,
    clearPackageJsonCache
  );
}

function readExecutorCollectionsFromNodeModules(
  workspaceJsonPath: string,
  clearPackageJsonCache: boolean
): ExecutorInfo[] {
  const basedir = join(workspaceJsonPath, '..');
  const nodeModulesDir = join(basedir, 'node_modules');

  if (clearPackageJsonCache) {
    clearJsonCache('package.json', basedir);
  }

  const packages: { [packageName: string]: string } =
    readAndCacheJsonFile('package.json', basedir).json.devDependencies || {};
  const executorCollections = Object.keys(packages).filter((p) => {
    try {
      const packageJson = readAndCacheJsonFile(
        join(p, 'package.json'),
        nodeModulesDir
      ).json;
      // TODO: to add support for schematics, we can change this to include schematics/generators
      return !!(packageJson.builders || packageJson.executors);
    } catch (e) {
      if (
        e.message &&
        (e.message.indexOf('no such file') > -1 ||
          e.message.indexOf('not a directory') > -1)
      ) {
        return false;
      } else {
        throw e;
      }
    }
  });

  return executorCollections
    .map((c) => readCollections(nodeModulesDir, c))
    .flat()
    .filter((c): c is ExecutorInfo => Boolean(c));
}

function readCollections(
  basedir: string,
  collectionName: string
): ExecutorInfo[] | null {
  try {
    const packageJson = readAndCacheJsonFile(
      join(collectionName, 'package.json'),
      basedir
    );

    const collection = readAndCacheJsonFile(
      packageJson.json.builders || packageJson.json.executors,
      dirname(packageJson.path)
    );

    return getBuilderPaths(collectionName, collection.path, collection.json);
  } catch (e) {
    return null;
  }
}

function getBuilderPaths(
  collectionName: string,
  path: string,
  json: any
): ExecutorInfo[] {
  const baseDir = dirname(path);

  const builders: ExecutorInfo[] = [];
  for (const [key, value] of Object.entries<any>(
    json.builders || json.executors
  )) {
    builders.push({
      name: `${collectionName}:${key}`,
      path: join(baseDir, value.schema),
    });
  }

  return builders;
}
