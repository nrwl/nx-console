import { ProjectsConfigurations } from '@nrwl/devkit';
import { Schema } from 'nx/src/utils/params';

export enum OptionType {
  Any = 'any',
  Array = 'array',
  Boolean = 'boolean',
  Number = 'number',
  String = 'string',
}

export type OptionPropertyDescription = Schema['properties'][number];

export type CliOption = {
  name: string;
  originalName?: string;
  positional?: number;
  alias?: string;
  hidden?: boolean;
  deprecated?: boolean | string;
} & OptionPropertyDescription;

export interface Option extends CliOption {
  tooltip?: string;
  itemTooltips?: ItemTooltips;
  items?: string[] | ItemsWithEnum;
  aliases: string[];
  isRequired: boolean;
  'x-dropdown'?: 'projects';
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
  type: 'confirmation' | 'input' | 'list' | string;
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
  configurations?: TargetConfiguration[];
  options: Option[];
  contextValues?: Record<string, string | number | boolean | undefined>;
}

export interface CollectionInfo {
  name: string;
  path: string;
  type: 'executor' | 'generator';
  data?: Generator;
}

export enum GeneratorType {
  Application = 'application',
  Library = 'library',
  Other = 'other',
}

export interface Generator {
  collection: string;
  name: string;
  description: string;
  options?: Option[];
  type: GeneratorType;
}

export interface DefaultValue {
  name: string;
  defaultValue: string | undefined;
}

export interface TargetConfiguration {
  name: string;
  defaultValues: DefaultValue[];
}

export interface Targets {
  name: string;
  project: string;
  builder: string;
  description: string;
  configurations: TargetConfiguration[];
  options: CliOption[];
}

export const WORKSPACE_GENERATOR_NAME_REGEX =
  /^workspace-(schematic|generator):(.+)/;

export type WorkspaceProjects = ProjectsConfigurations['projects'];

export type { Store } from './store';
