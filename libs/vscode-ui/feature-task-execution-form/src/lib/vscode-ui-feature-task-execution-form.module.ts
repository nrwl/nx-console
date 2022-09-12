import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskExecutionFormComponent } from './task-execution-form.component';
import { FormatTaskPipe } from './format-task/format-task.pipe';
import { VscodeUiComponentsModule } from '@nx-console/vscode-ui/components';
import { ArgumentListModule } from '@nx-console/vscode-ui/argument-list';

import { TASK_EXECUTION_SCHEMA } from './task-execution-form.schema';
import { TaskExecutionSchema } from '@nx-console/shared/schema';

declare global {
  interface Window {
    VSCODE_UI_SCHEMA: TaskExecutionSchema;
  }
}

export function getSchema() {
  return window.VSCODE_UI_SCHEMA;
}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClipboardModule,
    VscodeUiComponentsModule,
    ArgumentListModule,
  ],
  declarations: [TaskExecutionFormComponent, FormatTaskPipe],
  exports: [TaskExecutionFormComponent],
  providers: [
    {
      provide: TASK_EXECUTION_SCHEMA,
      useFactory: getSchema,
    },
  ],
})
export class VscodeUiFeatureTaskExecutionFormModule {}
