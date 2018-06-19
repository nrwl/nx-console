import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { WorkspacesComponent } from './workspaces/workspaces.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { DetailsComponent } from './details/details.component';
import { addonsRoutes, FeatureAddonsModule } from '@nxui/feature-addons';
import { FeatureGenerateModule, generateRoutes } from '@nxui/feature-generate';
import { FeatureRunModule, runRoutes } from '@nxui/feature-run';

export const workspaceRoutes: Route[] = [
  { path: '', component: WorkspacesComponent },
  {
    path: ':path', component: WorkspaceComponent, children: [
      {
        path: 'details',
        component: DetailsComponent
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'details'
      },
      {
        path: 'addons',
        children: addonsRoutes
      },
      {
        path: 'generate',
        children: generateRoutes
      },
      {
        path: 'run',
        children: runRoutes
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FeatureAddonsModule,
    FeatureGenerateModule,
    FeatureRunModule
  ],
  declarations: [WorkspacesComponent, WorkspaceComponent, DetailsComponent]
})
export class FeatureWorkspacesModule {
}
