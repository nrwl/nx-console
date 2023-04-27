import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ReactiveFormsModule } from '@angular/forms';
import { FormatTaskPipe } from './format-task/format-task.pipe';
import { GenerateUiComponentsModule } from '@nx-console/generate-ui/components';
import { TaskExecutionFormComponent } from './task-execution-form/task-execution-form.component';
import {
  BrowserAnimationsModule,
  NoopAnimationsModule,
} from '@angular/platform-browser/animations';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClipboardModule,
    GenerateUiComponentsModule,
    BrowserAnimationsModule,
  ],
  declarations: [TaskExecutionFormComponent, FormatTaskPipe],
  exports: [TaskExecutionFormComponent],
})
export class GenerateUiFeatureTaskExecutionFormModule {}

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClipboardModule,
    GenerateUiComponentsModule,
  ],
  declarations: [TaskExecutionFormComponent, FormatTaskPipe],
  exports: [TaskExecutionFormComponent],
})
export class GenerateUiFeatureTaskExecutionFormModuleForStorybook {}
