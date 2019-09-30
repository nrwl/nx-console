import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskExecutionFormComponent } from './task-execution-form.component';
import { VscodeUiComponentsModule } from '@angular-console/vscode-ui/components';

@NgModule({
  imports: [CommonModule, VscodeUiComponentsModule, ReactiveFormsModule],
  declarations: [TaskExecutionFormComponent],
  exports: [TaskExecutionFormComponent]
})
export class VscodeUiFeatureTaskExecutionFormModule {}
