import { WorkspaceTreeItem, ROUTE_LIST } from './workspace-tree-item';
import { AbstractTreeProvider } from '../abstract-tree-provider';
import { TreeItem } from 'vscode';
import { join } from 'path';

const SCANNING_FOR_WORKSPACE = new TreeItem(
  'Scanning for your Angular Workspace...'
);
export const LOCATE_YOUR_WORKSPACE = new TreeItem('Select workspace json');
LOCATE_YOUR_WORKSPACE.command = {
  tooltip: 'Select an workspace json file to open',
  title: 'Select workspace json',
  command: 'angularConsole.selectWorkspaceManually'
};
export const CHANGE_WORKSPACE = new TreeItem('Change workspace');
CHANGE_WORKSPACE.command = {
  tooltip: 'Select an workspace json file to open',
  title: 'Change workspace',
  command: 'angularConsole.selectWorkspaceManually'
};

export class WorkspaceTreeProvider extends AbstractTreeProvider<
  WorkspaceTreeItem | TreeItem
> {
  static create(config: {
    workspaceJsonPath?: string;
    extensionPath: string;
  }): WorkspaceTreeProvider {
    return new WorkspaceTreeProvider(
      config.workspaceJsonPath,
      config.extensionPath
    );
  }

  private scanning = Boolean(this.workspaceJsonPath);

  private constructor(
    public workspaceJsonPath: string | undefined,
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

  setWorkspaceJsonPath(workspaceJsonPath: string) {
    this.workspaceJsonPath = workspaceJsonPath;
    this.refresh();
  }

  getChildren() {
    const workspaceJsonPath = this.workspaceJsonPath;

    if (!workspaceJsonPath) {
      if (this.scanning) {
        return [SCANNING_FOR_WORKSPACE];
      } else {
        return [LOCATE_YOUR_WORKSPACE];
      }
    }

    return [
      ...ROUTE_LIST.map(
        route =>
          new WorkspaceTreeItem(workspaceJsonPath, route, this.extensionPath)
      ),
      CHANGE_WORKSPACE
    ];
  }
}
