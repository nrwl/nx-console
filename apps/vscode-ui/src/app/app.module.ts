import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  TaskExecutionFormComponent,
  VscodeUiFeatureTaskExecutionFormModule,
} from '@nx-console/vscode-ui/feature-task-execution-form';

import { environment } from '../environments/environment';

@NgModule({
  imports: [BrowserModule, VscodeUiFeatureTaskExecutionFormModule],
  providers: [...environment.providers],
  bootstrap: [TaskExecutionFormComponent],
})
export class AppModule {}
