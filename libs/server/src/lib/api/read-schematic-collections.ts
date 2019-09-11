import { Schematic, SchematicCollection } from '@angular-console/schema';
import * as path from 'path';

import {
  directoryExists,
  fileExistsSync,
  listFiles,
  listOfUnnestedNpmPackages,
  normalizeSchema,
  readJsonFile
} from '../utils/utils';

export function readAllSchematicCollections(
  basedir: string,
  workspaceSchematicsPath: string,
  workspaceSchematicsNpmScript: string
): SchematicCollection[] {
  const npmClient = fileExistsSync(path.join(basedir, 'yarn.lock'))
    ? 'yarn'
    : 'npm';

  let collections = readSchematicCollectionsFromNodeModules(basedir);
  if (directoryExists(path.join(basedir, workspaceSchematicsPath))) {
    collections = [
      readWorkspaceSchematicsCollection(
        basedir,
        workspaceSchematicsPath,
        npmClient,
        workspaceSchematicsNpmScript
      ),
      ...collections
    ];
  }
  return collections.filter(
    (collection): collection is SchematicCollection =>
      !!collection && collection!.schematics!.length > 0
  );
}

function readAngularJsonDefaults(basedir: string): any {
  const defaults = readJsonFile('angular.json', basedir).json.schematics;
  const collectionDefaults = Object.keys(defaults ? defaults : {}).reduce(
    (collectionDefaultsMap: any, key) => {
      const [collectionName, schematicName] = key.split(':');
      if (!collectionDefaultsMap[collectionName]) {
        collectionDefaultsMap[collectionName] = {};
      }
      collectionDefaultsMap[collectionName][schematicName] = defaults[key];
      return collectionDefaultsMap;
    },
    {}
  );
  return collectionDefaults;
}

function readSchematicCollectionsFromNodeModules(
  basedir: string
): SchematicCollection[] {
  const nodeModulesDir = path.join(basedir, 'node_modules');
  const packages = listOfUnnestedNpmPackages(nodeModulesDir);
  const schematicCollections = packages.filter(p => {
    try {
      return !!readJsonFile(path.join(p, 'package.json'), nodeModulesDir).json
        .schematics;
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

  return schematicCollections
    .map(c => readCollection(nodeModulesDir, c, defaults))
    .filter((c): c is SchematicCollection => Boolean(c));
}

function readWorkspaceSchematicsCollection(
  basedir: string,
  workspaceSchematicsPath: string,
  npmClient: string,
  workspaceSchematicsNpmScript: string
) {
  const collectionDir = path.join(basedir, workspaceSchematicsPath);
  const collectionName = 'Workspace Schematics';
  if (fileExistsSync(path.join(collectionDir, 'collection.json'))) {
    const collection = readJsonFile('collection.json', collectionDir);
    const defaults = readAngularJsonDefaults(basedir);

    return readCollectionSchematics(
      collectionName,
      collection.path,
      collection.json,
      defaults
    );
  } else {
    const schematics = listFiles(collectionDir)
      .filter(f => path.basename(f) === 'schema.json')
      .map(f => {
        const schemaJson = readJsonFile(f, '');
        return {
          name: schemaJson.json.id,
          collection: collectionName,
          schema: normalizeSchema(schemaJson.json),
          description: '',
          npmClient,
          npmScript: workspaceSchematicsNpmScript
        };
      });
    return { name: collectionName, schematics };
  }
}

function readCollection(
  basedir: string,
  collectionName: string,
  defaults?: any
): SchematicCollection | null {
  try {
    const packageJson = readJsonFile(
      path.join(collectionName, 'package.json'),
      basedir
    );
    const collection = readJsonFile(
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

function readCollectionSchematics(
  collectionName: string,
  collectionPath: string,
  collectionJson: any,
  defaults?: any
) {
  const schematicCollection = {
    name: collectionName,
    schematics: [] as Schematic[]
  };
  Object.entries(collectionJson.schematics).forEach(([k, v]: [any, any]) => {
    try {
      if (canAdd(k, v)) {
        const schematicSchema = readJsonFile(
          v.schema,
          path.dirname(collectionPath)
        );
        const projectDefaults =
          defaults && defaults[collectionName] && defaults[collectionName][k];

        schematicCollection.schematics.push({
          name: k,
          collection: collectionName,
          schema: normalizeSchema(schematicSchema.json, projectDefaults),
          description: v.description || '',
          npmClient: null,
          npmScript: null
        });
      }
    } catch (e) {
      console.error(
        `Invalid package.json for schematic ${collectionName}:${k}`
      );
    }
  });
  return schematicCollection;
}

export function canAdd(
  name: string,
  s: { hidden: boolean; private: boolean; schema: string; extends: boolean }
): boolean {
  return !s.hidden && !s.private && !s.extends && name !== 'ng-add';
}
