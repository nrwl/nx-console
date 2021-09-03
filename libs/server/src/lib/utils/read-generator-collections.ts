import {
  Option,
  Generator,
  GeneratorCollection,
  GeneratorType,
} from '@nx-console/schema';
import { basename, dirname, join } from 'path';

import {
  directoryExists,
  fileExistsSync,
  listFiles,
  listOfUnnestedNpmPackages,
  normalizeSchema,
  readAndCacheJsonFile,
  toLegacyWorkspaceFormat,
  toWorkspaceFormat,
} from './utils';

export async function readAllGeneratorCollections(
  workspaceJsonPath: string
): Promise<GeneratorCollection[]> {
  const basedir = join(workspaceJsonPath, '..');
  let collections = await readGeneratorCollectionsFromNodeModules(
    workspaceJsonPath
  );
  collections = [
    ...collections,
    ...(await checkAndReadWorkspaceCollection(
      basedir,
      join('tools', 'schematics')
    )),
    ...(await checkAndReadWorkspaceCollection(
      basedir,
      join('tools', 'generators')
    )),
  ];
  return collections.filter(
    (collection): collection is GeneratorCollection =>
      collection && collection.generators.length > 0
  );
}

async function checkAndReadWorkspaceCollection(
  basedir: string,
  workspaceGeneratorsPath: string
) {
  if (directoryExists(join(basedir, workspaceGeneratorsPath))) {
    return readWorkspaceGeneratorsCollection(
      basedir,
      workspaceGeneratorsPath
    ).then((val) => [val]);
  }
  return Promise.resolve([]);
}

function readWorkspaceJsonDefaults(workspaceJsonPath: string): any {
  const defaults =
    toWorkspaceFormat(readAndCacheJsonFile(workspaceJsonPath).json)
      .generators || {};
  const collectionDefaults = Object.keys(defaults).reduce(
    (collectionDefaultsMap: any, key) => {
      if (key.includes(':')) {
        const [collectionName, generatorName] = key.split(':');
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        collectionDefaultsMap[collectionName][generatorName] = defaults[key];
      } else {
        const collectionName = key;
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        Object.keys(defaults[collectionName]).forEach((generatorName) => {
          collectionDefaultsMap[collectionName][generatorName] =
            defaults[collectionName][generatorName];
        });
      }
      return collectionDefaultsMap;
    },
    {}
  );
  return collectionDefaults;
}

async function readGeneratorCollectionsFromNodeModules(
  workspaceJsonPath: string
): Promise<GeneratorCollection[]> {
  const basedir = join(workspaceJsonPath, '..');
  const nodeModulesDir = join(basedir, 'node_modules');
  const packages = listOfUnnestedNpmPackages(nodeModulesDir);
  const generatorCollections = packages.filter((p) => {
    try {
      const packageJson = readAndCacheJsonFile(
        join(p, 'package.json'),
        nodeModulesDir
      ).json;
      return !!(packageJson.schematics || packageJson.generators);
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

  return (
    await Promise.all(
      generatorCollections.map((c) => readCollection(nodeModulesDir, c))
    )
  ).filter((c): c is GeneratorCollection => Boolean(c));
}

async function readWorkspaceGeneratorsCollection(
  basedir: string,
  workspaceGeneratorsPath: string
): Promise<GeneratorCollection> {
  const collectionDir = join(basedir, workspaceGeneratorsPath);
  const collectionName = 'workspace-schematic';
  if (fileExistsSync(join(collectionDir, 'collection.json'))) {
    const collection = readAndCacheJsonFile('collection.json', collectionDir);

    return readCollectionGenerators(collectionName, collection.json);
  } else {
    const generators: Generator[] = await Promise.all(
      listFiles(collectionDir)
        .filter((f) => basename(f) === 'schema.json')
        .map(async (f) => {
          const schemaJson = readAndCacheJsonFile(f, '');
          return {
            name: schemaJson.json.id || schemaJson.json.$id,
            collection: collectionName,
            options: await normalizeSchema(schemaJson.json),
            description: '',
            type: GeneratorType.Other,
          };
        })
    );
    return { name: collectionName, generators };
  }
}

async function readCollection(
  basedir: string,
  collectionName: string
): Promise<GeneratorCollection | null> {
  try {
    const packageJson = readAndCacheJsonFile(
      join(collectionName, 'package.json'),
      basedir
    );
    const collection = readAndCacheJsonFile(
      packageJson.json.schematics || packageJson.json.generators,
      dirname(packageJson.path)
    );
    return readCollectionGenerators(collectionName, collection.json);
  } catch (e) {
    // this happens when package is misconfigured. We decided to ignore such a case.
    return null;
  }
}

function readCollectionGenerators(
  collectionName: string,
  collectionJson: any
): GeneratorCollection {
  const generators = new Set<Generator>();

  try {
    Object.entries(
      Object.assign({}, collectionJson.schematics, collectionJson.generators)
    ).forEach(([k, v]: [any, any]) => {
      try {
        if (canAdd(k, v)) {
          let generatorType: GeneratorType;
          switch (v['x-type']) {
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
          generators.add({
            name: k,
            collection: collectionName,
            description: v.description || '',
            type: generatorType,
          });
        }
      } catch (e) {
        console.error(e);
        console.error(
          `Invalid package.json for schematic ${collectionName}:${k}`
        );
      }
    });
  } catch (e) {
    console.error(e);
    console.error(`Invalid package.json for schematic ${collectionName}`);
  }
  return {
    name: collectionName,
    generators: Array.from(generators),
  };
}

export async function readGeneratorOptions(
  workspaceJsonPath: string,
  collectionName: string,
  generatorName: string
): Promise<Option[]> {
  const basedir = join(workspaceJsonPath, '..');
  const nodeModulesDir = join(basedir, 'node_modules');
  const collectionPackageJson = readAndCacheJsonFile(
    join(collectionName, 'package.json'),
    nodeModulesDir
  );
  const collectionJson = readAndCacheJsonFile(
    collectionPackageJson.json.schematics ||
      collectionPackageJson.json.generators,
    dirname(collectionPackageJson.path)
  );
  const generators = Object.assign(
    {},
    collectionJson.json.schematics,
    collectionJson.json.generators
  );

  const generatorSchema = readAndCacheJsonFile(
    generators[generatorName].schema,
    dirname(collectionJson.path)
  );
  const workspaceDefaults = readWorkspaceJsonDefaults(workspaceJsonPath);
  const defaults =
    workspaceDefaults &&
    workspaceDefaults[collectionName] &&
    workspaceDefaults[collectionName][generatorName];
  return await normalizeSchema(generatorSchema.json, defaults);
}

function canAdd(
  name: string,
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
