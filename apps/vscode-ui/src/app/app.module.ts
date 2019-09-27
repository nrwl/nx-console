import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {
  VscodeUiFeatureTaskExecutionFormModule,
  TaskExecutionFormComponent
} from '@angular-console/vscode-ui/feature-task-execution-form';

@NgModule({
  imports: [BrowserModule, VscodeUiFeatureTaskExecutionFormModule],
  providers: [],
  bootstrap: [TaskExecutionFormComponent]
})
export class AppModule {}
