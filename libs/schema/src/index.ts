import { Option as CliOption, OptionType } from '@angular/cli/models/interface';

export interface Option extends Omit<CliOption, 'default'> {
  component?: OptionComponent;
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

export enum OptionComponent {
  Autocomplete = 'autocomplete',
  Checkbox = 'checkBox',
  Input = 'input',
  Select = 'select',
  MultiSelect = 'multiSelect'
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

export interface ArchitectTaskExecutionSchema {
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

export interface TargetTaskExecutionSchema {
  name: string;
  command: string;
  positional: string;
  cliName: 'nx' | 'ng';
  executor?: string;
  description: string;
  configurations?: TargetConfiguration[];
  options: Option[];
  contextValues?: Record<string, string | number | boolean | undefined>;
}

export type TaskExecutionSchema = ArchitectTaskExecutionSchema | TargetTaskExecutionSchema;

export interface GeneratorCollection {
  name: string;
  generators: Generator[];
}

export interface Generator {
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

export type TargetConfiguration = ArchitectConfiguration;

export interface Project {
  name: string;
  root: string;
  projectType: string;
  target: (Architect | Target)[];
}

export interface Architect {
  name: string;
  project: string;
  builder: string;
  description: string;
  configurations: ArchitectConfiguration[];
  options: CliOption[];
}

export interface Target {
  name: string;
  project: string;
  executor: string;
  description: string;
  configurations: TargetConfiguration[];
  options: Option[];
}
