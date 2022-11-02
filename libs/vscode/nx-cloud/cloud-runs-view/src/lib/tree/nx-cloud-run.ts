import {
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { CloudRun } from '../cloud-run.model';
import { NxCloudTaskTreeData, NxCloudTaskTreeItem } from './nx-cloud-task';
import { NxCloudTreeDataBase } from './nx-cloud-tree-data-base';

export class NxCloudRunTreeData extends NxCloudTreeDataBase {
  static readonly type = 'NxCloudRun';

  success: boolean;
  command: string;
  cloudRun: CloudRun;

  constructor(cloudRun: CloudRun) {
    super();
    this.cloudRun = cloudRun;
    this.success = cloudRun.tasks.every((t) => t.status === 0);
    this.command = cloudRun.command;
  }

  getTasks(): NxCloudTaskTreeData[] {
    return this.cloudRun.tasks.map((t) => new NxCloudTaskTreeData(t));
  }
}

export class NxCloudRunTreeItem extends TreeItem {
  public type = 'NxCloudRunTreeItem';
  public tasksExpanded = false;

  constructor(treeData: NxCloudRunTreeData) {
    super(treeData.command);
    this.iconPath = new ThemeIcon(
      treeData.success ? 'pass' : 'stop',
      new ThemeColor(
        treeData.success ? 'testing.iconPassed' : 'testing.iconFailed'
      )
    );
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
  }
}
