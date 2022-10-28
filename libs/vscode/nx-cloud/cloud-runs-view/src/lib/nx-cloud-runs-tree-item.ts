import { ThemeColor, ThemeIcon, TreeItem } from 'vscode';

export class NxCloudRunsTreeItem extends TreeItem {
  constructor(command: string, success: boolean) {
    super(command);
    this.iconPath = new ThemeIcon(
      success ? 'pass' : 'stop',
      new ThemeColor(success ? 'testing.iconPassed' : 'testing.iconFailed')
    );
  }
}
