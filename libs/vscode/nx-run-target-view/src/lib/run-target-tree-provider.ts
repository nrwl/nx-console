import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { join } from 'path';
import { commands, ExtensionContext, TreeItem } from 'vscode';
import { commandList, RunTargetTreeItem } from './run-target-tree-item';

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
    WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '')
  );
  private extensionPath: string;

  /**
   * Provides data for the "Generate & Run Target" view
   */
  constructor(readonly context: ExtensionContext) {
    super();
    const extensionPath = context.extensionPath;
    this.extensionPath = extensionPath;
    LOCATE_YOUR_WORKSPACE.iconPath = {
      light: join(extensionPath, 'assets', 'nx-console-light.svg'),
      dark: join(extensionPath, 'assets', 'nx-console-dark.svg'),
    };
    CHANGE_WORKSPACE.iconPath = {
      light: join(extensionPath, 'assets', 'nx-console-light.svg'),
      dark: join(extensionPath, 'assets', 'nx-console-dark.svg'),
    };
    context.subscriptions.push(
      commands.registerCommand(
        `nxConsole.refreshRunTargetTree`,
        this.refreshRunTargetTree
      )
    );
  }

  getParent() {
    return null;
  }

  endScan() {
    this.scanning = false;
    this.refresh();
  }

  async getChildren() {
    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );

    if (!workspacePath) {
      if (this.scanning) {
        return [SCANNING_FOR_WORKSPACE];
      } else {
        return [LOCATE_YOUR_WORKSPACE];
      }
    }

    CHANGE_WORKSPACE.description = 'Current: ' + workspacePath;

    return [
      ...(await commandList()).map(
        (command) => new RunTargetTreeItem(command, this.extensionPath)
      ),
      CHANGE_WORKSPACE,
    ];
  }

  private refreshRunTargetTree = async () => {
    this.refresh();
  };
}
