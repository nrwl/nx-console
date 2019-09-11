import {
  extensionsRoutes,
  FeatureExtensionsModule
} from '@angular-console/feature-extensions';
import {
  FeatureGenerateModule,
  generateRoutes,
  SchematicComponent
} from '@angular-console/feature-generate';
import {
  FeatureRunModule,
  runRoutes,
  TargetComponent
} from '@angular-console/feature-run';
import { settingsRoutes } from '@angular-console/feature-settings';
import { UiModule } from '@angular-console/ui';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Route, RouterModule } from '@angular/router';
import {
  connectRootRoutes,
  connectWorkspaceRoutes
} from '@nrwl/angular-console-enterprise-frontend';

import { ProjectsComponent } from './projects/projects.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { FilterMenuComponent } from './projects/filter-menu/filter-menu.component';

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
  { path: 'settings', children: settingsRoutes },
  {
    path: 'workspace/:path',
    component: WorkspaceComponent,
    data: { state: WORKSPACE },
    children: [
      {
        data: { state: 'projects' },
        path: 'projects',
        component: ProjectsComponent,
        children: [
          {
            path: 'generate/:collection/:schematic',
            component: SchematicComponent
          },
          {
            path: 'task/:target/:project',
            component: TargetComponent
          }
        ]
      },
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        data: { state: 'extensions' },
        path: 'extensions',
        children: extensionsRoutes
      },
      {
        path: 'connect',
        children: [...connectWorkspaceRoutes, ...connectRootRoutes]
      },
      {
        data: { state: 'generate' },
        path: 'generate',
        children: generateRoutes
      },
      { data: { state: 'tasks' }, path: 'tasks', children: runRoutes },
      { path: 'settings', children: settingsRoutes }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule,
    FeatureExtensionsModule,
    FeatureGenerateModule,
    FeatureRunModule,
    ReactiveFormsModule,
    UiModule
  ],
  declarations: [ProjectsComponent, WorkspaceComponent, FilterMenuComponent]
})
export class FeatureWorkspacesModule {}
