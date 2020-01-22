import { Option } from '@angular/cli/models/interface';
export { Option } from '@angular/cli/models/interface';

export interface TaskExecutionMessage {
  command: string;
  positional: string;
  flags: string[];
}

export interface TaskExecutionSchema {
  name: string;
  command: string;
  positional: string;
  cliName: 'nx' | 'ng';
  builder?: string;
  description: string;
  configurations?: ArchitectConfiguration[];
  options: Option[];
}

export interface SchematicCollection {
  name: string;
  schematics: Schematic[];
}

export interface Schematic {
  collection: string;
  name: string;
  description: string;
  options: Option[];
}

export interface DefaultValue {
  name: string;
  defaultValue: string | undefined;
}

export interface ArchitectConfiguration {
  name: string;
  defaultValues: DefaultValue[];
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
  configurations: ArchitectConfiguration[];
  options: Option[];
}
