import { Generator, GeneratorCollection } from '@nx-console/schema';
import { basename, dirname, join } from 'path';

import {
  directoryExists,
  fileExistsSync,
  listFiles,
  listOfUnnestedNpmPackages,
  normalizeSchema,
  readAndCacheJsonFile,
  readAndParseJson
} from './utils';

export async function readAllGeneratorCollections(
  workspaceJsonPath: string,
  workspaceGeneratorsPath: string
): Promise<GeneratorCollection[]> {
  const basedir = join(workspaceJsonPath, '..');
  let collections = await readGeneratorCollectionsFromNodeModules(
    workspaceJsonPath
  );
  if (directoryExists(join(basedir, workspaceGeneratorsPath))) {
    collections = [
      await readWorkspaceGeneratorsCollection(basedir, workspaceGeneratorsPath),
      ...collections
    ];
  }
  return collections.filter(
    (collection): collection is GeneratorCollection =>
      !!collection && collection!.generators!.length > 0
  );
}

function readWorkspaceJsonDefaults(workspaceJsonPath: string): any {
  const defaults = readAndParseJson(workspaceJsonPath).schematics || {}; // generators?
  const collectionDefaults = Object.keys(defaults).reduce(
    (collectionDefaultsMap: any, key) => {
      if (key.includes(':')) {
        const [collectionName, schematicName] = key.split(':');
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        collectionDefaultsMap[collectionName][schematicName] = defaults[key];
      } else {
        const collectionName = key;
        if (!collectionDefaultsMap[collectionName]) {
          collectionDefaultsMap[collectionName] = {};
        }
        Object.keys(defaults[collectionName]).forEach(schematicName => {
          collectionDefaultsMap[collectionName][schematicName] =
            defaults[collectionName][schematicName];
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
  const schematicCollections = packages.filter(p => {
    try {
      return !!readAndCacheJsonFile(join(p, 'package.json'), nodeModulesDir)
        .json.schematics;
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
  const defaults = readWorkspaceJsonDefaults(workspaceJsonPath);

  return (await Promise.all(
    schematicCollections.map(c => readCollection(nodeModulesDir, c, defaults))
  )).filter((c): c is GeneratorCollection => Boolean(c));
}

async function readWorkspaceGeneratorsCollection(
  basedir: string,
  workspaceSchematicsPath: string
): Promise<{
  name: string;
  generators: Generator[];
}> {
  const collectionDir = join(basedir, workspaceSchematicsPath);
  const collectionName = 'workspace-schematic';
  if (fileExistsSync(join(collectionDir, 'collection.json'))) {
    const collection = readAndCacheJsonFile('collection.json', collectionDir);

    return await readCollectionGenerators(
      collectionName,
      collection.path,
      collection.json
    );
  } else {
    const generators: Generator[] = await Promise.all(
      listFiles(collectionDir)
        .filter(f => basename(f) === 'schema.json')
        .map(async f => {
          const schemaJson = readAndCacheJsonFile(f, '');
          return {
            name: schemaJson.json.id,
            collection: collectionName,
            options: await normalizeSchema(schemaJson.json),
            description: ''
          };
        })
    );
    return { name: collectionName, generators };
  }
}

async function readCollection(
  basedir: string,
  collectionName: string,
  defaults?: any
): Promise<GeneratorCollection | null> {
  try {
    const packageJson = readAndCacheJsonFile(
      join(collectionName, 'package.json'),
      basedir
    );
    const collection = readAndCacheJsonFile(
      packageJson.json.schematics, // gnerators?
      dirname(packageJson.path)
    );
    return readCollectionGenerators(
      collectionName,
      collection.path,
      collection.json,
      defaults
    );
  } catch (e) {
    // this happens when package is misconfigured. We decided to ignore such a case.
    return null;
  }
}

async function readCollectionGenerators(
  collectionName: string,
  collectionPath: string,
  collectionJson: any,
  defaults?: any
) {
  const generatorCollection = {
    name: collectionName,
    generators: [] as Generator[]
  };
  try {
    Object.entries({...collectionJson.schematics, ...collectionJson.generators}).forEach(
      async ([k, v]: [any, any]) => {
        try {
          if (canAdd(k, v)) {
            const generatorSchema = readAndCacheJsonFile(
              v.schema,
              dirname(collectionPath)
            );
            const projectDefaults =
              defaults &&
              defaults[collectionName] &&
              defaults[collectionName][k];

            generatorCollection.generators.push({
              name: k,
              collection: collectionName,
              options: await normalizeSchema(
                generatorSchema.json,
                projectDefaults
              ),
              description: v.description || ''
            });
          }
        } catch (e) {
          console.error(e);
          console.error(
            `Invalid package.json for schematic ${collectionName}:${k}`
          );
        }
      }
    );
  } catch (e) {
    console.error(e);
    console.error(`Invalid package.json for schematic ${collectionName}`);
  }
  return generatorCollection;
}

export function canAdd(
  name: string,
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
