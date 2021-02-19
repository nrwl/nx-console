import { Option as CliOption, OptionType } from '@angular/cli/models/interface';

export interface Option extends Omit<CliOption, 'default'> {
  tooltip?: string;
  itemTooltips?: ItemTooltips;
  items?: string[] | ItemsWithEnum;
  default?: string[] | string | number | boolean | undefined;
}

export interface ItemTooltips {
  [itemValue: string]: string;
}

export interface ItemsWithEnum {
  enum: string[];
  type: OptionType;
}

export type XPrompt = string | LongFormXPrompt;
export interface LongFormXPrompt {
  message: string;
  type: 'confirmation' | 'input' | 'list';
  multiselect?: boolean;
  items?: (string | OptionItemLabelValue)[];
}

export interface OptionItemLabelValue {
  label: string;
  value: string;
}

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
  contextValues?: Record<string, string | number | boolean | undefined>;
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
  options: CliOption[];
}

export const WORKSPACE_GENERATOR_NAME_REGEX = /^workspace-(schematic|generator):(.+)/;
