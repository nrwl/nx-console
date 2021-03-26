import { TreeItem } from 'vscode';

import { AbstractTreeProvider } from '@nx-console/server';
import { ROUTE_LIST, RunTargetTreeItem } from './run-target-tree-item';
import { dirname, join } from 'path';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';

const SCANNING_FOR_WORKSPACE = new TreeItem(
  'Scanning for your Nx Workspace...'
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

export class RunTargetTreeProvider extends AbstractTreeProvider<
  RunTargetTreeItem | TreeItem
> {
  private scanning = Boolean(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );

  /**
   * Provides data for the "Generate & Run Target" view
   */
  constructor(readonly extensionPath: string) {
    super();
    LOCATE_YOUR_WORKSPACE.iconPath = {
      light: join(extensionPath, 'assets', 'nx-console-light.svg'),
      dark: join(extensionPath, 'assets', 'nx-console-dark.svg'),
    };
    CHANGE_WORKSPACE.iconPath = {
      light: join(extensionPath, 'assets', 'nx-console-light.svg'),
      dark: join(extensionPath, 'assets', 'nx-console-dark.svg'),
    };
  }

  getParent() {
    return null;
  }

  endScan() {
    this.scanning = false;
    this.refresh();
  }

  getChildren() {
    const workspaceJsonPath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspaceJsonPath',
      ''
    );

    if (!workspaceJsonPath) {
      if (this.scanning) {
        return [SCANNING_FOR_WORKSPACE];
      } else {
        return [LOCATE_YOUR_WORKSPACE];
      }
    }

    CHANGE_WORKSPACE.description = "Current: " + dirname(workspaceJsonPath);

    return [
      ...ROUTE_LIST.map(
        (route) =>
          new RunTargetTreeItem(workspaceJsonPath, route, this.extensionPath)
      ),
      CHANGE_WORKSPACE,
    ];
  }
}
