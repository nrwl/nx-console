import { WorkspaceDefinition } from '@angular-console/schema';
import { settingsChange$ } from '@angular-console/server';
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

    settingsChange$.subscribe(() => {
      this.refresh();
    });
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
