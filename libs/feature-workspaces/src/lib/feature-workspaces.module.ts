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
import { FeatureGenerateModule, generateRoutes } from '@nxui/feature-generate';
import { FeatureRunModule, runRoutes } from '@nxui/feature-run';
import { DetailsComponent } from '@nxui/feature-workspaces/src/lib/details/details.component';
import { ImportWorkspaceComponent } from '@nxui/feature-workspaces/src/lib/import-workspace/import-workspace.component';
import { NewWorkspaceComponent } from '@nxui/feature-workspaces/src/lib/new-workspace/new-workspace.component';
import { WorkspaceComponent } from '@nxui/feature-workspaces/src/lib/workspace/workspace.component';
import { WorkspacesComponent } from '@nxui/feature-workspaces/src/lib/workspaces/workspaces.component';
import { UiModule } from '@nxui/ui';
import {
  extensionsRoutes,
  FeatureExtensionsModule
} from '@nxui/feature-extensions';

export type FeatureWorkspaceRouteState =
  | 'workspaces'
  | 'create-workspace'
  | 'import-workspace'
  | 'workspace';

export const WORKSPACES: FeatureWorkspaceRouteState = 'workspaces';
export const CREATE_WORKSPACE: FeatureWorkspaceRouteState = 'create-workspace';
export const IMPORT_WORKSPACE: FeatureWorkspaceRouteState = 'import-workspace';
export const WORKSPACE: FeatureWorkspaceRouteState = 'workspace';

export const workspaceRoutes: Route[] = [
  {
    path: 'workspaces',
    component: WorkspacesComponent,
    data: { state: WORKSPACES }
  },
  {
    path: 'create-workspace',
    component: NewWorkspaceComponent,
    data: { state: CREATE_WORKSPACE }
  },
  {
    path: 'import-workspace',
    component: ImportWorkspaceComponent,
    data: { state: IMPORT_WORKSPACE }
  },
  {
    path: 'workspace/:path',
    component: WorkspaceComponent,
    data: { state: WORKSPACE },
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
        children: extensionsRoutes
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
    FeatureExtensionsModule,
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
