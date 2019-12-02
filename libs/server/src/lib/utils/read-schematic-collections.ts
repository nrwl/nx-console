import { Schematic, SchematicCollection } from '@angular-console/schema';
import * as path from 'path';
import {
  fileExistsSync,
  directoryExists,
  readAndCacheJsonFile,
  listOfUnnestedNpmPackages,
  normalizeSchema,
  listFiles,
  readAndParseJson
} from './utils';

export async function readAllSchematicCollections(
  basedir: string,
  workspaceSchematicsPath: string
): Promise<SchematicCollection[]> {
  let collections = await readSchematicCollectionsFromNodeModules(basedir);
  if (directoryExists(path.join(basedir, workspaceSchematicsPath))) {
    collections = [
      await readWorkspaceSchematicsCollection(basedir, workspaceSchematicsPath),
      ...collections
    ];
  }
  return collections.filter(
    (collection): collection is SchematicCollection =>
      !!collection && collection!.schematics!.length > 0
  );
}

function readAngularJsonDefaults(basedir: string): any {
  const defaults =
    readAndParseJson(path.join(basedir, 'angular.json')).schematics || {};
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

async function readSchematicCollectionsFromNodeModules(
  basedir: string
): Promise<SchematicCollection[]> {
  const nodeModulesDir = path.join(basedir, 'node_modules');
  const packages = listOfUnnestedNpmPackages(nodeModulesDir);
  const schematicCollections = packages.filter(p => {
    try {
      return !!readAndCacheJsonFile(
        path.join(p, 'package.json'),
        nodeModulesDir
      ).json.schematics;
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
  const defaults = readAngularJsonDefaults(basedir);

  return (await Promise.all(
    schematicCollections.map(c => readCollection(nodeModulesDir, c, defaults))
  )).filter((c): c is SchematicCollection => Boolean(c));
}

async function readWorkspaceSchematicsCollection(
  basedir: string,
  workspaceSchematicsPath: string
): Promise<{
  name: string;
  schematics: Schematic[];
}> {
  const collectionDir = path.join(basedir, workspaceSchematicsPath);
  const collectionName = 'workspace-schematic';
  if (fileExistsSync(path.join(collectionDir, 'collection.json'))) {
    const collection = readAndCacheJsonFile('collection.json', collectionDir);

    return await readCollectionSchematics(
      collectionName,
      collection.path,
      collection.json
    );
  } else {
    const schematics: Schematic[] = await Promise.all(
      listFiles(collectionDir)
        .filter(f => path.basename(f) === 'schema.json')
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
    return { name: collectionName, schematics };
  }
}

async function readCollection(
  basedir: string,
  collectionName: string,
  defaults?: any
): Promise<SchematicCollection | null> {
  try {
    const packageJson = readAndCacheJsonFile(
      path.join(collectionName, 'package.json'),
      basedir
    );
    const collection = readAndCacheJsonFile(
      packageJson.json.schematics,
      path.dirname(packageJson.path)
    );
    return readCollectionSchematics(
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

async function readCollectionSchematics(
  collectionName: string,
  collectionPath: string,
  collectionJson: any,
  defaults?: any
) {
  const schematicCollection = {
    name: collectionName,
    schematics: [] as Schematic[]
  };
  Object.entries(collectionJson.schematics).forEach(
    async ([k, v]: [any, any]) => {
      try {
        if (canAdd(k, v)) {
          const schematicSchema = readAndCacheJsonFile(
            v.schema,
            path.dirname(collectionPath)
          );
          const projectDefaults =
            defaults && defaults[collectionName] && defaults[collectionName][k];

          schematicCollection.schematics.push({
            name: k,
            collection: collectionName,
            options: await normalizeSchema(
              schematicSchema.json,
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
  return schematicCollection;
}

export function canAdd(
  name: string,
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
