import * as path from 'path';

import {
  directoryExists,
  fileExistsSync,
  listFiles,
  listOfUnnestedNpmPackages,
  normalizeSchema,
  readJsonFile
} from '../utils';

interface SchematicCollection {
  name: string;
  schematics: Schematic[];
}

interface Schematic {
  collection: string;
  name: string;
  description: string;
  npmClient: string | null;
  npmScript: string | null;
  schema: {
    name: string;
    type: string;
    description: string;
    defaultValue: string;
    required: boolean;
    positional: boolean;
    enum: string[];
    completion: 'module' | 'file' | 'project' | undefined;
  }[];
}

export function readAllSchematicCollections(
  basedir: string,
  workspaceSchematicsPath: string,
  workspaceSchematicsNpmScript: string
) {
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
    collection => !!collection && collection.schematics.length > 0
  );
}

function readSchematicCollectionsFromNodeModules(basedir: string) {
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
  return schematicCollections.map(c => readCollection(nodeModulesDir, c));
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
    return readCollectionSchematics(
      collectionName,
      collection.path,
      collection.json
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
  collectionName: string
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
      collection.json
    );
  } catch (e) {
    // this happens when package is misconfigured. We decided to ignore such a case.
    return null;
  }
}

function readCollectionSchematics(
  collectionName: string,
  collectionPath: string,
  collectionJson: any
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

        schematicCollection.schematics.push({
          name: k,
          collection: collectionName,
          schema: normalizeSchema(schematicSchema.json),
          description: v.description,
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
