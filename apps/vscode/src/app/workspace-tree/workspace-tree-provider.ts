import { TreeItem } from 'vscode';

import { AbstractTreeProvider } from '../abstract-tree-provider';
import { ROUTE_LIST, WorkspaceTreeItem } from './workspace-tree-item';
import { join } from 'path';

const SCANNING_FOR_WORKSPACE = new TreeItem(
  'Scanning for your Angular Workspace...'
);
export const LOCATE_YOUR_WORKSPACE = new TreeItem('Select workspace');
LOCATE_YOUR_WORKSPACE.command = {
  tooltip: 'Select an workspace directory to open',
  title: 'Select workspace',
  command: 'nxConsole.selectWorkspaceManually',
};
export const CHANGE_WORKSPACE = new TreeItem('Change workspace');
CHANGE_WORKSPACE.command = {
  tooltip: 'Select an workspace json file to open',
  title: 'Change workspace',
  command: 'nxConsole.selectWorkspaceManually',
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
      'nx-console.svg'
    );
    CHANGE_WORKSPACE.iconPath = join(extensionPath, 'assets', 'nx-console.svg');
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
        (route) =>
          new WorkspaceTreeItem(workspaceJsonPath, route, this.extensionPath)
      ),
      CHANGE_WORKSPACE,
    ];
  }
}
