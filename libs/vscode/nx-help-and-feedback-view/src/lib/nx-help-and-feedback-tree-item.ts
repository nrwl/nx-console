import {
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  commands,
} from 'vscode';

export class NxHelpAndFeedbackTreeItem extends TreeItem {
  commandString: string;

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
    this.contextValue = link;
    this.commandString = `nxConsole.helpAndFeedback.openUrl.${this.title.replace(
      ' ',
      '_'
    )}`;
    this.command = {
      title: this.title,
      command: this.commandString,
    };

    this.registerCommand(this.link);
  }

  // kinda hacky but just setting 'command' on the TreeItem doesn't work anymore
  async registerCommand(url: string) {
    const openCommand = (await commands.getCommands(true)).find(
      (command) => command === this.commandString
    );
    if (!openCommand) {
      commands.registerCommand(this.commandString, () => {
        commands.executeCommand('vscode.open', url);
      });
    }
  }
}
