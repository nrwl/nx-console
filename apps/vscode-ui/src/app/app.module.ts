import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { VscodeUiFeatureTaskExecutionFormModule } from '@angular-console/vscode-ui/feature-task-execution-form';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, VscodeUiFeatureTaskExecutionFormModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
