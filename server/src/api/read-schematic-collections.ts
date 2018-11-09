import * as path from 'path';
import {
  fileExistsSync,
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

export function readAllSchematicCollections(basedir: string) {
  const nodeModulesDir = path.join(basedir, 'node_modules');
  const packages = listOfUnnestedNpmPackages(nodeModulesDir);
  const relativeRootPath = './..';
  const schematicCollections = [relativeRootPath, ...packages].filter(p => {
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
  return schematicCollections
    .map(c => readSchematicCollections(nodeModulesDir, relativeRootPath, c))
    .filter(collection => !!collection && collection.schematics.length > 0);
}

function readSchematicCollections(
  basedir: string,
  rootCollection: string,
  collectionName: string
): SchematicCollection {
  try {
    const packageJson = readJsonFile(
      path.join(collectionName, 'package.json'),
      basedir
    );
    const collection = readJsonFile(
      packageJson.json.schematics,
      path.dirname(packageJson.path)
    );
    const name =
      collectionName === rootCollection
        ? `.${packageJson.json.name}`
        : collectionName;
    const schematicCollection = {
      name,
      schematics: [] as Schematic[]
    };
    Object.entries(collection.json.schematics).forEach(([k, v]: [any, any]) => {
      if (canAdd(k, v)) {
        const schematicSchema = readJsonFile(
          v.schema,
          path.dirname(collection.path)
        );

        schematicCollection.schematics.push({
          name: k,
          collection: name,
          schema: normalizeSchema(schematicSchema.json),
          description: v.description
        });
      }
    });
    return schematicCollection;
  } catch (e) {
    // this happens when package is misconfigured. We decided to ignore such a case.
    return null;
  }
}

function canAdd(
  name: string,
  s: { hidden: boolean; extends: string; schema: string }
): boolean {
  return !s.hidden && !s.extends && !!s.schema && name !== 'ng-add';
}
