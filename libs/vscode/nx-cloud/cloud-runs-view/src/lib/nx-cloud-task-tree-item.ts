import {
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { CloudRunTask } from './cloud-run.model';

export class NxCloudTaskTreeItem extends TreeItem {
  constructor(task: CloudRunTask) {
    super(task.projectName, TreeItemCollapsibleState.None);
    const success = task.status === 0;
    this.iconPath = this.iconPath = new ThemeIcon(
      success ? 'pass' : 'stop',
      new ThemeColor(success ? 'testing.iconPassed' : 'testing.iconFailed')
    );
  }
}
