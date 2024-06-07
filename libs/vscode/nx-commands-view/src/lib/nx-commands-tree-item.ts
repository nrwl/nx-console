import {
  Command,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode';
import { join } from 'path';
import { EXECUTE_ARBITRARY_COMMAND } from './init-nx-commands-view';

export type NxCommandConfig =
  | {
      type: 'add-dependency';
    }
  | {
      type: 'add-dev-dependency';
    }
  | {
      type: 'select-workspace';
    }
  | {
      command: string;
      type: 'vscode-command' | 'arbitrary-command';
      label: string;
    }
  | {
      target: string;
      type: 'target';
    };

export class NxCommandsTreeItem extends TreeItem {
  constructor(
    readonly commandConfig: NxCommandConfig,
    readonly extensionPath: string
  ) {
    super('', TreeItemCollapsibleState.None);
    this.label = this.getLabel(commandConfig);

    this.command = this.getCommand(commandConfig);

    this.iconPath = this.getIcon(commandConfig);
  }

  private getLabel(commandConfig: NxCommandConfig): string {
    if (commandConfig.type === 'add-dependency') {
      return 'Add Dependency';
    } else if (commandConfig.type === 'add-dev-dependency') {
      return 'Add Dev Dependency';
    } else if (commandConfig.type === 'select-workspace') {
      return 'Select workspace';
    } else if (commandConfig.type === 'target') {
      return commandConfig.target;
    } else {
      return commandConfig.label;
    }
  }

  private getCommand(commandConfig: NxCommandConfig): Command {
    switch (commandConfig.type) {
      case 'arbitrary-command':
        return {
          title: commandConfig.command,
          command: EXECUTE_ARBITRARY_COMMAND,
          arguments: [commandConfig.command],
          tooltip: `Run ${commandConfig.label}`,
        };
      case 'vscode-command':
        return {
          title: commandConfig.command,
          command: commandConfig.command,
          tooltip: `Run ${commandConfig.label}`,
        };
      case 'add-dependency':
        return {
          title: 'Add Dependency',
          command: 'nxConsole.addDependency',
          tooltip: 'Add Dependency',
        };
      case 'add-dev-dependency':
        return {
          title: 'Add Dev Dependency',
          command: 'nxConsole.addDevDependency',
          tooltip: 'Add Dev Dependency',
        };
      case 'select-workspace':
        return {
          title: 'Select workspace',
          command: 'nxConsole.selectWorkspaceManually',
          tooltip: 'Select the folder that contains your Nx workspace',
        };
      case 'target':
        return {
          title: commandConfig.target,
          command: 'nx.run',
          arguments: [undefined, commandConfig.target],
          tooltip: `Run ${commandConfig.target} for a project of your choosing`,
        };
    }
  }

  private getIcon(commandConfig: NxCommandConfig) {
    if (commandConfig.type === 'add-dependency') {
      return {
        light: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-light.svg')
        ),
        dark: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-dark.svg')
        ),
      };
    } else if (commandConfig.type === 'add-dev-dependency') {
      return {
        light: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-light.svg')
        ),
        dark: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-dark.svg')
        ),
      };
    } else if (commandConfig.type === 'select-workspace') {
      return new ThemeIcon('folder-opened');
    } else if (commandConfig.type === 'target') {
      return new ThemeIcon('play');
    } else {
      return {
        light: Uri.file(join(this.extensionPath, 'assets', 'nx-cli-light.svg')),
        dark: Uri.file(join(this.extensionPath, 'assets', 'nx-cli-dark.svg')),
      };
    }
  }
}
