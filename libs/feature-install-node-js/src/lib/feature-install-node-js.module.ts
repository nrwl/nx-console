import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InstallNodeJsComponent } from './install-node-js.component';
import { UiModule } from '@angular-console/ui';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    RouterModule.forChild([
      { path: '', pathMatch: 'full', component: InstallNodeJsComponent }
    ])
  ],
  declarations: [InstallNodeJsComponent]
})
export class FeatureInstallNodeJsModule {}
