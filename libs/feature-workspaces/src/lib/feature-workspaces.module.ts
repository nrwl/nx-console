import {
  extensionsRoutes,
  FeatureExtensionsModule
} from '@angular-console/feature-extensions';
import {
  FeatureGenerateModule,
  generateRoutes
} from '@angular-console/feature-generate';
import { FeatureRunModule, runRoutes } from '@angular-console/feature-run';
import { UiModule } from '@angular-console/ui';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material';
import { Route, RouterModule } from '@angular/router';

import { OpenWorkspaceComponent } from './open-workspace/open-workspace.component';
import { NewWorkspaceDialogComponent } from './new-workspace/new-workspace-dialog.component';
import { NewWorkspaceComponent } from './new-workspace/new-workspace.component';
import { ProjectsComponent } from './projects/projects.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { WorkspacesComponent } from './workspaces/workspaces.component';

export type FeatureWorkspaceRouteState =
  | 'workspaces'
  | 'create-workspace'
  | 'open-workspace'
  | 'workspace';

export const WORKSPACES: FeatureWorkspaceRouteState = 'workspaces';
export const CREATE_WORKSPACE: FeatureWorkspaceRouteState = 'create-workspace';
export const IMPORT_WORKSPACE: FeatureWorkspaceRouteState = 'open-workspace';
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
    path: 'open-workspace',
    component: OpenWorkspaceComponent,
    data: { state: IMPORT_WORKSPACE }
  },
  {
    path: 'workspace/:path',
    component: WorkspaceComponent,
    data: { state: WORKSPACE },
    children: [
      {
        data: { state: 'projects' },
        path: 'projects',
        component: ProjectsComponent
      },
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
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
    ProjectsComponent,
    NewWorkspaceComponent,
    OpenWorkspaceComponent,
    WorkspaceComponent,
    WorkspacesComponent,
    NewWorkspaceDialogComponent
  ],
  entryComponents: [NewWorkspaceDialogComponent]
})
export class FeatureWorkspacesModule {}
