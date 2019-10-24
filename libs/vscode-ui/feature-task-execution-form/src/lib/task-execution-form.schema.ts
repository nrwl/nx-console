import {
  ArchitectConfigurations,
  Options,
  Schema
} from '@angular-console/schema';
import { InjectionToken } from '@angular/core';

export const TASK_EXECUTION_SCHEMA = new InjectionToken(
  'VSCODE_UI_FEATURE_TASK_EXECUTION_FORM_SCHEMA'
);

export interface TaskExecutionSchema {
  name: string;
  command: string;
  positional: string;
  builder?: string;
  description: string;
  options?: Options;
  configurations?: ArchitectConfigurations[];
  schema: Schema[];
}
