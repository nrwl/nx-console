import { InjectionToken } from '@angular/core';
import { Architect } from '@angular-console/schema';

export const TASK_EXECUTION_SCHEMA = new InjectionToken(
  'VSCODE_UI_FEATURE_TASK_EXECUTION_FORM_SCHEMA'
);

export interface TaskExecutionSchema extends Architect {}

// export interface TaskExecutionSchema {
//   name: string;
//   project: string;
//   builder: string;
//   description: string;
//   defaultValues: {
//     [fieldName: string]: string;
//   };
//   configurations: Configuration[];
//   fields: Schema[]; // TODO: Update this to Field when Nicole's code is checked in.
// }

// export interface Field {
//   name: string;
//   description: string;
//   important?: boolean;
//   type: 'completion' | 'select' | 'input' | 'checkbox';
//   required: boolean;
//   positional: boolean;
//   options?: string[];
// }

// export interface Configuration {
//   name: string;
//   defaultValues: {
//     [fieldName: string]: string;
//   };
// }
