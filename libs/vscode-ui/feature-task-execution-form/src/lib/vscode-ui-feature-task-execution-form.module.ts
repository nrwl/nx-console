import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskExecutionFormComponent } from './task-execution-form.component';
import { VscodeUiComponentsModule } from '@angular-console/vscode-ui/components';

import { TASK_EXECUTION_SCHEMA } from './task-execution-form.schema';
import { TaskExecutionSchema } from '@angular-console/schema';

declare global {
  interface Window {
    VSCODE_UI_SCHEMA: TaskExecutionSchema;
  }
}

export function getSchema() {
  return window.VSCODE_UI_SCHEMA;
}

@NgModule({
  imports: [CommonModule, VscodeUiComponentsModule, ReactiveFormsModule],
  declarations: [TaskExecutionFormComponent],
  exports: [TaskExecutionFormComponent],
  providers: [
    {
      provide: TASK_EXECUTION_SCHEMA,
      useFactory: getSchema
    }
  ]
})
export class VscodeUiFeatureTaskExecutionFormModule {}
