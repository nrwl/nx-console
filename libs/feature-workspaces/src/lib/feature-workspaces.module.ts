import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Route, RouterModule } from '@angular/router';

import {
  FeatureGenerateModule,
  generateRoutes
} from '@angular-console/feature-generate';
import { FeatureRunModule, runRoutes } from '@angular-console/feature-run';
import { UiModule } from '@angular-console/ui';

import { DetailsComponent } from './details/details.component';
import { ImportWorkspaceComponent } from './import-workspace/import-workspace.component';
import {
  NewWorkspaceComponent,
  CreateNewWorkspaceDialog
} from './new-workspace/new-workspace.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { WorkspacesComponent } from './workspaces/workspaces.component';

import {
  extensionsRoutes,
  FeatureExtensionsModule
} from '@angular-console/feature-extensions';
import { MatDialogModule } from '../../../../node_modules/@angular/material';

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
    MatDialogModule,
    RouterModule,
    FeatureExtensionsModule,
    FeatureGenerateModule,
    FeatureRunModule,
    ReactiveFormsModule,
    UiModule
  ],
  declarations: [
    DetailsComponent,
    NewWorkspaceComponent,
    ImportWorkspaceComponent,
    WorkspaceComponent,
    WorkspacesComponent,
    CreateNewWorkspaceDialog
  ],
  entryComponents: [CreateNewWorkspaceDialog]
})
export class FeatureWorkspacesModule {}
