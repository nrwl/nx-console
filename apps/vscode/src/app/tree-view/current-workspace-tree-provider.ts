import { WorkspaceDefinition } from '@angular-console/schema';
import { join } from 'path';
import { TreeItem } from 'vscode';

import {
  WorkspaceRoute,
  WorkspaceRouteTitle
} from '../tree-item/workspace-route';
import { AbstractTreeProvider } from './abstract-tree-provider';

const SCANNING_FOR_WORKSPACE = new TreeItem(
  'Scanning for your Angular Workspace...'
);
export const SELECT_A_DIFFERENT_WORKSPACE = new TreeItem('Switch workspace');
export const LOCATE_YOUR_WORKSPACE = new TreeItem(
  'Select an Angular Workspace'
);
LOCATE_YOUR_WORKSPACE.command = {
  tooltip: 'Select an angular.json file',
  title: 'Select an angular.json file',
  command: 'extension.angularConsole.selectWorkspaceManually'
};
SELECT_A_DIFFERENT_WORKSPACE.command = LOCATE_YOUR_WORKSPACE.command;

export class CurrentWorkspaceTreeProvider extends AbstractTreeProvider<
  WorkspaceRoute | TreeItem
> {
  static create(config: {
    workspacePath?: string;
    extensionPath: string;
  }): CurrentWorkspaceTreeProvider {
    return new CurrentWorkspaceTreeProvider(
      config.workspacePath
        ? {
            path: config.workspacePath,
            pinnedProjectNames: [],
            name: ''
          }
        : null,
      config.extensionPath
    );
  }

  private scanning = Boolean(this.currentWorkspace);

  private constructor(
    private currentWorkspace: WorkspaceDefinition | null,
    private readonly extensionPath: string
  ) {
    super();

    LOCATE_YOUR_WORKSPACE.iconPath = join(
      extensionPath,
      'assets',
      'extension_icon.png'
    );
    SELECT_A_DIFFERENT_WORKSPACE.iconPath = LOCATE_YOUR_WORKSPACE.iconPath;
  }

  getParent(_: WorkspaceRoute) {
    return null;
  }

  endScan() {
    this.scanning = false;
    this.refresh();
  }

  setWorkspacePath(workspacePath: string) {
    this.currentWorkspace = {
      path: workspacePath,
      pinnedProjectNames: [],
      name: ''
    };

    this.refresh();
  }

  getChildren() {
    const workspace = this.currentWorkspace;

    if (!workspace) {
      if (this.scanning) {
        return [SCANNING_FOR_WORKSPACE];
      } else {
        return [LOCATE_YOUR_WORKSPACE];
      }
    }

    return [
      ...[
        'Projects',
        'Generate',
        'Tasks',
        'Extensions',
        'Dependency diagram',
        'Connect',
        'Settings'
      ].map(
        route =>
          new WorkspaceRoute(
            workspace,
            route as WorkspaceRouteTitle,
            this.extensionPath
          )
      ),
      SELECT_A_DIFFERENT_WORKSPACE
    ];
  }
}
