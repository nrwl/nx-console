import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

import { EXECUTE_ARBITRARY_COMMAND } from './nx-commands-provider';

export type NxCommandConfig =
  | {
      type: 'add-dependency';
      command: 'nxConsole.addDependency';
      label: 'Add Dependency';
    }
  | {
      type: 'add-dev-dependency';
      command: 'nxConsole.addDevDependency';
      label: 'Add Dev Dependency';
    }
  | {
      command: string;
      type: 'vscode-command' | 'arbitrary-command';
      label: string;
    };

export class NxCommandsTreeItem extends TreeItem {
  constructor(
    readonly commandConfig: NxCommandConfig,
    readonly extensionPath: string
  ) {
    super(commandConfig.label, TreeItemCollapsibleState.None);

    this.command = {
      title: commandConfig.label,
      command:
        commandConfig.type === 'arbitrary-command'
          ? EXECUTE_ARBITRARY_COMMAND
          : commandConfig.command,
      arguments:
        commandConfig.type === 'arbitrary-command'
          ? [commandConfig.command]
          : [],
      tooltip:
        commandConfig.type === 'add-dependency' ||
        commandConfig.type === 'add-dev-dependency'
          ? commandConfig.label
          : `Run ${commandConfig.label}`,
    };

    this.setIcon(commandConfig);
  }

  setIcon(commandConfig: NxCommandConfig) {
    if (commandConfig.type === 'add-dependency') {
      this.iconPath = {
        light: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-light.svg')
        ),
        dark: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-dark.svg')
        ),
      };
    } else if (commandConfig.type === 'add-dev-dependency') {
      this.iconPath = {
        light: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-light.svg')
        ),
        dark: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-dark.svg')
        ),
      };
    } else {
      this.iconPath = {
        light: Uri.file(join(this.extensionPath, 'assets', 'nx-cli-light.svg')),
        dark: Uri.file(join(this.extensionPath, 'assets', 'nx-cli-dark.svg')),
      };
    }
  }
}
