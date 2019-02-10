import { Schema, NpmScript } from './lib/generated/graphql-types';

export * from './lib/generated/graphql-types';

export interface File {
  name: string;
}

export interface Directory {
  path: string;
  exists: boolean;
  files: Array<File>;
}

export type AutocompletionType =
  | 'localModules'
  | 'absoluteModules'
  | 'projects'
  | 'file';

export interface Schematic {
  collection: string;
  name: string;
  description: string;
  schema: Schema[];
  npmClient: string | null;
  npmScript: string | null;
}

export interface SchematicCollection {
  name: string;
  schematics: Array<Schematic>;
}

export interface NpmScripts {
  name: string;
  scripts: NpmScript[];
}
