import {
  getNxWorkspacePath,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import {
  AbstractTreeProvider,
  getOutputChannel,
} from '@nx-console/vscode/utils';
import { join } from 'path';
import { commands, ExtensionContext, TreeItem } from 'vscode';
import { RunTargetTreeItem } from './run-target-tree-item';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';

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
    onWorkspaceRefreshed(() => this.refresh());
  }

  getParent() {
    return null;
  }

  async getChildren() {
    let workspacePath = null;
    try {
      workspacePath = getNxWorkspacePath();
    } catch (e) {
      getOutputChannel().appendLine(
        `Unable to load workspace path: ${e.stack}`
      );
      return [LOCATE_YOUR_WORKSPACE];
    }

    CHANGE_WORKSPACE.description = 'Current: ' + workspacePath;

    return [
      ...(await commandList()).map(
        (command) => new RunTargetTreeItem(command, this.extensionPath)
      ),
      CHANGE_WORKSPACE,
    ];
  }
}

const commandList = async (): Promise<string[]> => {
  const defaultCommands = ['generate', 'run'];
  const workspaceSpecificTargetNames = await getTargetNames();
  return [...defaultCommands, ...workspaceSpecificTargetNames];
};

async function getTargetNames(): Promise<string[]> {
  const workspace = (await getNxWorkspace())?.workspace ?? { projects: {} };
  const commands = Object.values(workspace.projects).reduce((acc, project) => {
    for (const target of Object.keys(project.targets ?? {})) {
      acc.add(target);
    }
    return acc;
  }, new Set<string>());
  return Array.from(commands).sort();
}
