import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskExecutionFormComponent } from './task-execution-form.component';
import { FormatTaskPipe } from './format-task/format-task.pipe';
import { GenerateUiComponentsModule } from '@nx-console/generate-ui/components';
import { ArgumentListModule } from '@nx-console/generate-ui/argument-list';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClipboardModule,
    GenerateUiComponentsModule,
    ArgumentListModule,
  ],
  declarations: [TaskExecutionFormComponent, FormatTaskPipe],
  exports: [TaskExecutionFormComponent],
})
export class GenerateUiFeatureTaskExecutionFormModule {}
