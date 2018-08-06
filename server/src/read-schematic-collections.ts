import * as path from 'path';
import { normalizeSchema, readJsonFile } from './utils';

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

export function readSchematicCollections(
  basedir: string,
  collectionName: string
): SchematicCollection[] {
  const packageJson = readJsonFile(
    path.join(collectionName, 'package.json'),
    basedir
  );
  const collection = readJsonFile(
    packageJson.json.schematics,
    path.dirname(packageJson.path)
  );
  const collectionSchematics = [];
  let ex = [] as any[];
  if (collection.json.extends) {
    const e = Array.isArray(collection.json.extends)
      ? collection.json.extends
      : [collection.json.extends];
    ex = [...ex, ...e];
  }

  const schematicCollection = {
    name: collectionName,
    schematics: [] as Schematic[]
  };
  Object.entries(collection.json.schematics).forEach(([k, v]: [any, any]) => {
    if (!v.hidden) {
      if (v.extends) {
        ex.push(v.extends.split(':')[0]);
      } else {
        const schematicSchema = readJsonFile(
          v.schema,
          path.dirname(collection.path)
        );

        schematicCollection.schematics.push({
          name: k,
          collection: collectionName,
          schema: normalizeSchema(schematicSchema.json),
          description: v.description
        });
      }
    }
  });

  let res = [schematicCollection];
  new Set(ex).forEach(e => {
    res = [...res, ...readSchematicCollections(basedir, e)];
  });
  return res;
}
