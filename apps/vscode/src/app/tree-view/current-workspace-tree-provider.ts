import { WorkspaceDefinition } from '@angular-console/schema';
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
    workspacePath: string,
    extensionPath: string
  ): TreeDataProvider<WorkspaceRoute> {
    return new CurrentWorkspaceTreeProvider(
      {
        path: workspacePath,
        pinnedProjectNames: [],
        name: ''
      },
      extensionPath
    );
  }

  private constructor(
    private readonly currentWorkspace: WorkspaceDefinition,
    private readonly extensionPath: string
  ) {
    super();
  }

  getParent(_: WorkspaceRoute) {
    return null;
  }

  getChildren() {
    return Promise.resolve(
      [
        'Projects',
        'Generate',
        'Tasks',
        'Extensions',
        'Dependency Diagram',
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
