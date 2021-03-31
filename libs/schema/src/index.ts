import { Schema } from '@nrwl/tao/src/shared/params';

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
  required?: boolean;
  positional?: number;
  alias?: string;
  hidden?: boolean;
  deprecated?: boolean | string;
} & OptionPropertyDescription;

export interface Option extends Omit<CliOption, 'default'> {
  tooltip?: string;
  itemTooltips?: ItemTooltips;
  items?: string[] | ItemsWithEnum;
  aliases: string[];
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

export interface Project {
  name: string;
  root: string;
  projectType: string;
  targets: Targets[];
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

/**
 * Should be in Typescript 4.4+ remove this when we upgrade to that version
 */
export type Awaited<T> = T extends null | undefined
  ? T // special case for `null | undefined` when not in `--strictNullChecks` mode
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object & { then(onfulfilled: infer F): any } // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
  ? F extends (value: infer V) => any // if the argument to `then` is callable, extracts the argument
    ? Awaited<V> // recursively unwrap the value
    : never // the argument to `then` was not callable
  : T;
