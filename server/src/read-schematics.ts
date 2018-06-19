import * as path from 'path';
import { normalizeSchema, readJsonFile } from './utils';

interface Schematic {
  collection: string;
  name: string;
  description: string;
  schema: { name: string, type: string, description: string, defaultValue: string, required: boolean, positional: boolean, enum: string[] }[]
}

export function readSchematics(basedir: string, collectionName: string): Schematic[] {
  const packageJson = readJsonFile(path.join(collectionName, 'package.json'), basedir);
  const collection = readJsonFile(packageJson.json.schematics, path.dirname(packageJson.path));

  const collectionSchematics = [];
  const ex = [];
  if (collection.json.extends) {
    ex.push(collection.json.extends);
  }

  Object.entries(collection.json.schematics).forEach(([k, v]: [any, any]) => {
    if (!v.hidden) {
      if (v.extends) {
        ex.push(v.extends.split(':')[0]);
      } else {
        const schematicSchema = readJsonFile(v.schema, path.dirname(collection.path));
        collectionSchematics.push({
          name: k,
          collection: collectionName,
          schema: normalizeSchema(schematicSchema.json),
          description: v.description
        });
      }
    }
  });

  let res = [...collectionSchematics];
  new Set(ex).forEach(e => {
    res = [...res, ...readSchematics(basedir, e)];
  });

  return res;
}
