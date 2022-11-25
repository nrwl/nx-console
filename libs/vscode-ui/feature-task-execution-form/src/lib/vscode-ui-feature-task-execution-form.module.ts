import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ArgumentListModule } from '@nx-console/vscode-ui/argument-list';
import { VscodeUiComponentsModule } from '@nx-console/vscode-ui/components';

import { FormatTaskPipe } from './format-task/format-task.pipe';
import { TaskExecutionFormComponent } from './task-execution-form.component';

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
})
export class VscodeUiFeatureTaskExecutionFormModule {}
