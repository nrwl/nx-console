import { NgModule } from '@angular/core';

import { UiModule } from '@angular-console/ui';

import { ProjectLoaderComponent } from './project-loader/project-loader.component';

export const appShellRoutes = [
  {
    path: '_app-shell',
    component: ProjectLoaderComponent
  }
];

@NgModule({
  imports: [
    UiModule
  ],
  declarations: [ProjectLoaderComponent]
})
export class FeatureAppShellModule {}
