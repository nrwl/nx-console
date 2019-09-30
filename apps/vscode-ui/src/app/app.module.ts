import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {
  VscodeUiFeatureTaskExecutionFormModule,
  TaskExecutionFormComponent
} from '@angular-console/vscode-ui/feature-task-execution-form';
import { environment } from '../environments/environment';

@NgModule({
  imports: [BrowserModule, VscodeUiFeatureTaskExecutionFormModule],
  providers: [...environment.providers],
  bootstrap: [TaskExecutionFormComponent]
})
export class AppModule {}
