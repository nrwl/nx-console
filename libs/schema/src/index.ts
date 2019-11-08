export interface Schema {
  name: string;
  type: string;
  description: string;
  defaultValue?: string;
  important?: boolean;
  completion?: string;
  deprecated?: string;
  required: boolean;
  positional: boolean;
  enum?: string[];
}

export interface SchematicCollectionForNgNew {
  name: string;
  description: string;
  schema: Schema[];
}

export interface SchematicCollection {
  name: string;
  schematics: Schematic[];
}

export interface Schematic {
  collection: string;
  name: string;
  description: string;
  schema: Schema[];
}

export interface Options {
  defaultValues: FieldValue[];
}

export interface FieldValue {
  name: string;
  defaultValue?: string;
}

export interface ArchitectConfigurations {
  name: string;
  defaultValues: FieldValue[];
}

export interface Project {
  name: string;
  root: string;
  projectType: string;
  architect: Architect[];
}

export interface Architect {
  name: string;
  project: string;
  builder: string;
  description: string;
  options: Options;
  configurations: ArchitectConfigurations[];
  schema: Schema[];
}
