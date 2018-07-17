import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatButtonModule,
  MatIconModule,
  MatRippleModule,
  MatSidenavModule,
  MatTooltipModule,
  MatCardModule
} from '@angular/material';
import { Route, RouterModule } from '@angular/router';
import { addonsRoutes, FeatureAddonsModule } from '@nxui/feature-addons';
import { FeatureGenerateModule, generateRoutes } from '@nxui/feature-generate';
import { FeatureRunModule, runRoutes } from '@nxui/feature-run';
import { DetailsComponent } from '@nxui/feature-workspaces/src/lib/details/details.component';
import { ImportWorkspaceComponent } from '@nxui/feature-workspaces/src/lib/import-workspace/import-workspace.component';
import { NewWorkspaceComponent } from '@nxui/feature-workspaces/src/lib/new-workspace/new-workspace.component';
import { WorkspaceComponent } from '@nxui/feature-workspaces/src/lib/workspace/workspace.component';
import { WorkspacesComponent } from '@nxui/feature-workspaces/src/lib/workspaces/workspaces.component';
import { UiModule } from '@nxui/ui';

export const workspaceRoutes: Route[] = [
  {
    path: 'workspaces',
    component: WorkspacesComponent,
    data: { state: 'workspaces' }
  },
  {
    path: 'create-workspace',
    component: NewWorkspaceComponent,
    data: { state: 'create-workspace' }
  },
  {
    path: 'import-workspace',
    component: ImportWorkspaceComponent,
    data: { state: 'import-workspace' }
  },
  {
    path: 'workspace/:path',
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
    MatCardModule,
    MatRippleModule,
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
    NewWorkspaceComponent,
    ImportWorkspaceComponent
  ]
})
export class FeatureWorkspacesModule {}
