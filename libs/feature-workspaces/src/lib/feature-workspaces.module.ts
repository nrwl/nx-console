import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Route, RouterModule } from '@angular/router';
import {
  connectRootRoutes,
  connectWorkspaceRoutes
} from '@nrwl/angular-console-enterprise-frontend';

import { WorkspaceComponent } from './workspace/workspace.component';
import { HttpClientModule } from '@angular/common/http';
import { FlexLayoutModule } from '@angular/flex-layout';
import { CommonModule } from '@angular/common';

export type FeatureWorkspaceRouteState =
  | 'workspaces'
  | 'create-workspace'
  | 'workspace';

export const WORKSPACES: FeatureWorkspaceRouteState = 'workspaces';
export const CREATE_WORKSPACE: FeatureWorkspaceRouteState = 'create-workspace';
export const WORKSPACE: FeatureWorkspaceRouteState = 'workspace';

export const workspaceRoutes: Route[] = [
  {
    path: 'connect',
    children: connectRootRoutes
  },
  {
    path: 'workspace/:path',
    component: WorkspaceComponent,
    data: { state: WORKSPACE },
    children: [
      {
        path: 'connect',
        children: [...connectWorkspaceRoutes, ...connectRootRoutes]
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule,
    ReactiveFormsModule,
    HttpClientModule,
    CommonModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule
  ],
  declarations: [WorkspaceComponent]
})
export class FeatureWorkspacesModule {}
