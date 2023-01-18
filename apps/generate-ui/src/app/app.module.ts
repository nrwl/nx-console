import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {
  GenerateUiFeatureTaskExecutionFormModule,
  TaskExecutionFormComponent,
} from '@nx-console/generate-ui/feature-task-execution-form';
import { environment } from '../environments/environment';

@NgModule({
  imports: [BrowserModule, GenerateUiFeatureTaskExecutionFormModule],
  providers: [...environment.providers],
  bootstrap: [TaskExecutionFormComponent],
})
export class AppModule {}
