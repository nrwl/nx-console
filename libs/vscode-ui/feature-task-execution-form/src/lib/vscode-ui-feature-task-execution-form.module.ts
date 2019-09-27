import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskExecutionFormComponent } from './task-execution-form.component';
import { VscodeUiComponentsModule } from '@angular-console/vscode-ui/components';

import {
  TASK_EXECUTION_SCHEMA,
  TaskExecutionSchema
} from './task-execution-form.schema';

declare global {
  interface Window {
    VSCODE_UI_SCHEMA: TaskExecutionSchema;
  }
}

@NgModule({
  imports: [CommonModule, VscodeUiComponentsModule, ReactiveFormsModule],
  declarations: [TaskExecutionFormComponent],
  exports: [TaskExecutionFormComponent],
  providers: [
    {
      provide: TASK_EXECUTION_SCHEMA,
      useFactory: () => window.VSCODE_UI_SCHEMA
    }
  ]
})
export class VscodeUiFeatureTaskExecutionFormModule {}
