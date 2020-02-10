import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { join } from 'path';

export class AffectedTreeItem extends TreeItem {
  command = {
    title: this.affectedCommand,
    command: `nx.${this.affectedCommand.replace(':', '.')}`,
    tooltip: `Run nx ${this.affectedCommand}`
  };

  iconPath = Uri.file(join(this.extensionPath, 'assets', 'nx-cli.svg'));

  constructor(
    readonly affectedCommand: string,
    readonly extensionPath: string
  ) {
    super(affectedCommand, TreeItemCollapsibleState.None);
  }
}
