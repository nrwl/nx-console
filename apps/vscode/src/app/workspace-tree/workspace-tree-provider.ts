import { WorkspaceTreeItem, ROUTE_LIST } from './workspace-tree-item';
import { AbstractTreeProvider } from '../abstract-tree-provider';
import { TreeItem } from 'vscode';
import { join } from 'path';

const SCANNING_FOR_WORKSPACE = new TreeItem(
  'Scanning for your Angular Workspace...'
);
export const LOCATE_YOUR_WORKSPACE = new TreeItem('Select angular.json');
LOCATE_YOUR_WORKSPACE.command = {
  tooltip: 'Select an angular.json file to open',
  title: 'Select angular.json',
  command: 'angularConsole.selectWorkspaceManually'
};
export const CHANGE_WORKSPACE = new TreeItem('Change workspace');
CHANGE_WORKSPACE.command = {
  tooltip: 'Select an angular.json file to open',
  title: 'Change workspace',
  command: 'angularConsole.selectWorkspaceManually'
};

export class WorkspaceTreeProvider extends AbstractTreeProvider<
  WorkspaceTreeItem | TreeItem
> {
  static create(config: {
    workspacePath?: string;
    extensionPath: string;
  }): WorkspaceTreeProvider {
    return new WorkspaceTreeProvider(
      config.workspacePath,
      config.extensionPath
    );
  }

  private scanning = Boolean(this.workspacePath);

  private constructor(
    public workspacePath: string | undefined,
    readonly extensionPath: string
  ) {
    super();

    LOCATE_YOUR_WORKSPACE.iconPath = join(
      extensionPath,
      'assets',
      'angular-console.png'
    );
    CHANGE_WORKSPACE.iconPath = join(
      extensionPath,
      'assets',
      'angular-console.png'
    );
  }

  getParent(_: WorkspaceTreeItem) {
    return null;
  }

  endScan() {
    this.scanning = false;
    this.refresh();
  }

  setWorkspacePath(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.refresh();
  }

  getChildren() {
    const workspacePath = this.workspacePath;

    if (!workspacePath) {
      if (this.scanning) {
        return [SCANNING_FOR_WORKSPACE];
      } else {
        return [LOCATE_YOUR_WORKSPACE];
      }
    }

    return [
      ...ROUTE_LIST.map(
        route => new WorkspaceTreeItem(workspacePath, route, this.extensionPath)
      ),
      CHANGE_WORKSPACE
    ];
  }
}
