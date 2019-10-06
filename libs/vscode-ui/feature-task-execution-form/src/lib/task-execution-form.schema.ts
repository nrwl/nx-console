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
  title: string;
  name: string;
  project?: string;
  builder?: string;
  collection?: string;
  description: string;
  options?: Options;
  configurations?: ArchitectConfigurations[];
  schema: Schema[];
}
