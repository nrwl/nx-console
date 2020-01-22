import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class AffectedTreeItem extends TreeItem {
  command = {
    title: this.affectedCommand,
    command: `nx.${this.affectedCommand.replace(':', '.')}`,
    tooltip: `Run nx ${this.affectedCommand}`
  };

  constructor(readonly affectedCommand: string) {
    super(affectedCommand, TreeItemCollapsibleState.None);
  }
}
