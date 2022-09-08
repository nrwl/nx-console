import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

export class NxHelpAndFeedbackTreeItem extends TreeItem {
  command = {
    title: this.title,
    command: `vscode.open`,
    arguments: [`${this.link}`],
  };

  constructor(
    private readonly title: string,
    private readonly link: string,
    readonly icon:
      | string
      | Uri
      | { light: string | Uri; dark: string | Uri }
      | ThemeIcon
  ) {
    super(title, TreeItemCollapsibleState.None);
    this.iconPath = icon;
  }
}
