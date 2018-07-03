import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { Route, RouterModule } from '@angular/router';
import { addonsRoutes, FeatureAddonsModule } from '@nxui/feature-addons';
import { FeatureGenerateModule, generateRoutes } from '@nxui/feature-generate';
import { FeatureRunModule, runRoutes } from '@nxui/feature-run';
import {
  MatToolbarModule,
  MatSidenavModule,
  MatIconModule,
  MatTooltipModule,
  MatButtonModule,
  MatRippleModule
} from '@angular/material';

import { DetailsComponent } from './details/details.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { WorkspacesComponent } from './workspaces/workspaces.component';
import { NewWorkspaceComponent } from './new-workspace/new-workspace.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '@nxui/ui';

export const workspaceRoutes: Route[] = [
  { path: '', component: WorkspacesComponent },
  { path: 'new', component: NewWorkspaceComponent },
  {
    path: ':path',
    component: WorkspaceComponent,
    children: [
      {
        data: { state: 'details' },
        path: 'details',
        component: DetailsComponent
      },
      { path: '', pathMatch: 'full', redirectTo: 'details' },
      {
        data: { state: 'extensions' },
        path: 'extensions',
        children: addonsRoutes
      },
      {
        data: { state: 'generate' },
        path: 'generate',
        children: generateRoutes
      },
      { data: { state: 'tasks' }, path: 'tasks', children: runRoutes }
    ]
  }
];

@NgModule({
  imports: [
    MatButtonModule,
    MatRippleModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatTooltipModule,
    FlexLayoutModule,
    CommonModule,
    RouterModule,
    FeatureAddonsModule,
    FeatureGenerateModule,
    FeatureRunModule,
    ReactiveFormsModule,
    UiModule
  ],
  declarations: [
    WorkspacesComponent,
    WorkspaceComponent,
    DetailsComponent,
    NewWorkspaceComponent
  ]
})
export class FeatureWorkspacesModule {}
