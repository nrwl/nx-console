import {
  settingsChange$,
  WorkspaceDefinition,
  Settings
} from '@angular-console/server';
import { readFileSync } from 'fs';
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
    settings: Settings,
    workspacePath: string,
    extensionPath: string
  ): TreeDataProvider<WorkspaceRoute> {
    let name = '';
    if (workspacePath) {
      try {
        name = JSON.parse(
          readFileSync(join(workspacePath, 'angular.json'), 'utf8')
        ).name;
      } catch (e) {
        console.error('Could not parse angular.json', e);
      }
    }
    return new CurrentWorkspaceTreeProvider(
      settings,
      {
        path: workspacePath,
        name
      },
      extensionPath
    );
  }

  private constructor(
    private settings: Settings,
    private readonly currentWorkspace: WorkspaceDefinition,
    private readonly extensionPath: string
  ) {
    super();

    settingsChange$.subscribe(s => {
      this.settings = s;
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
        ...(this.settings.isConnectUser ? ['Affected Projects'] : []),
        'Generate',
        'Tasks',
        'Extensions',
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
