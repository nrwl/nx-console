import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { join } from 'path';

export class NxCommandsTreeItem extends TreeItem {
  command = {
    title: this.affectedCommand,
    command: `nx.${this.affectedCommand.replace(':', '.')}`,
    tooltip: `Run nx ${this.affectedCommand}`,
  };

  iconPath = {
    light: Uri.file(join(this.extensionPath, 'assets', 'nx-cli-light.svg')),
    dark: Uri.file(join(this.extensionPath, 'assets', 'nx-cli-dark.svg')),
  };

  constructor(
    readonly affectedCommand: string,
    readonly extensionPath: string
  ) {
    super(affectedCommand, TreeItemCollapsibleState.None);
    if (this.affectedCommand === 'add-dependency') {
      this.command = {
        title: this.affectedCommand,
        command: 'nxConsole.addDependency',
        tooltip: 'Add dependency',
      };
      this.iconPath = {
        light: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-light.svg')
        ),
        dark: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-dark.svg')
        ),
      };
    }
    if (this.affectedCommand === 'add-dev-dependency') {
      this.command = {
        title: this.affectedCommand,
        command: 'nxConsole.addDevDependency',
        tooltip: 'Add dev dependency',
      };
      this.iconPath = {
        light: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-light.svg')
        ),
        dark: Uri.file(
          join(this.extensionPath, 'assets', 'nx-console-dark.svg')
        ),
      };
    }
  }
}
