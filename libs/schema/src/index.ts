import { Observable } from 'rxjs';

export type AutocompletionType = 'modules' | 'projects' | 'file';

export type LocalFileType = 'file' | 'directory' | 'angularDirectory';

export interface LocalFile {
  name: string;
  type: LocalFileType;
}

export interface Directory {
  path: string;
  files: Array<LocalFile>;
}

export interface CompletetionValue {
  value: string | null;
  display?: string;
}

export interface Field {
  name: string;
  enum: string[];
  type: string;
  description: string;
  defaultValue: any;
  required: boolean;
  positional: boolean;
  important: boolean;
  completion?: AutocompletionType;
  completionValues?: Observable<Array<CompletetionValue>>;
}

export interface Schematic {
  collection: string;
  name: string;
  description: string;
  schema: Field[];
}

export interface SchematicCollection {
  name: string;
  schematics: Array<Schematic>;
}

export interface ExtensionGroup {
  name: string;
  extensions: Extension[];
}

export interface Extension {
  name: string;
  description: string;
  detailedDescription: string;
  installed: boolean;
}

export interface Builder {
  name: string;
  description: string;
  builder: string;
  project: string;
  schema: Field[];
}

export interface Project {
  name: string;
  projectType: string;
  root: string;
  architect: Builder[];
}

export interface NpmScript {
  name: string;
  npmClient: string;
  schema: Field[];
}

export interface NpmScripts {
  name: string;
  scripts: NpmScript[];
}
