import { WorkspaceDefinition } from '@angular-console/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TreeDataProvider } from 'vscode';

import {
  WorkspaceRoute,
  WorkspaceRouteTitle
} from '../tree-item/workspace-route';
import { AbstractTreeProvider } from './abstract-tree-provider';

export class CurrentWorkspaceTreeProvider extends AbstractTreeProvider<
  WorkspaceRoute
> {
  static create(
    workspacePath: string | undefined,
    extensionPath: string
  ): TreeDataProvider<WorkspaceRoute> {
    const isAngularCliWorkspace =
      workspacePath && existsSync(join(workspacePath, 'angular.json'));
    let name = '';
    if (workspacePath && isAngularCliWorkspace) {
      try {
        name = JSON.parse(
          readFileSync(join(workspacePath, 'angular.json'), 'utf8')
        ).name;
      } catch (e) {
        console.error('Could not parse angular.json', e);
      }
    }
    return new CurrentWorkspaceTreeProvider(
      workspacePath && isAngularCliWorkspace
        ? {
            path: workspacePath,
            name
          }
        : undefined,
      extensionPath
    );
  }

  private constructor(
    private readonly currentWorkspace: WorkspaceDefinition | undefined,
    private readonly extensionPath: string
  ) {
    super();
  }

  getParent(element: WorkspaceRoute) {
    return null;
  }

  getChildren() {
    return Promise.resolve(
      [
        ...(this.currentWorkspace
          ? ['Projects', 'Generate', 'Tasks', 'Extensions']
          : []),
        'Connect',
        'Settings'
      ].map(
        route =>
          new WorkspaceRoute(
            this.currentWorkspace,
            route as WorkspaceRouteTitle,
            this.extensionPath
          )
      )
    );
  }
}
