import {
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { CloudRun } from './cloud-run.model';
import { NxCloudTaskTreeItem } from './nx-cloud-task-tree-item';

export class NxCloudRunTreeItem extends TreeItem {
  public type = 'NxCloudRunTreeItem';
  public tasksExpanded = false;

  constructor(public cloudRun: CloudRun) {
    super(cloudRun.command);
    const success = cloudRun.tasks.every((t) => t.status === 0);
    this.iconPath = new ThemeIcon(
      success ? 'pass' : 'stop',
      new ThemeColor(success ? 'testing.iconPassed' : 'testing.iconFailed')
    );
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
  }

  public getTasks(): NxCloudTaskTreeItem[] {
    return this.cloudRun.tasks.map((t) => new NxCloudTaskTreeItem(t));
  }
}
