import {
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from 'vscode';
import { CloudRunTask } from '../cloud-run.model';
import { NxCloudTreeDataBase } from './nx-cloud-tree-data-base';

export class NxCloudTaskTreeData extends NxCloudTreeDataBase {
  static readonly type = 'NxCloudTask';
  success: boolean;
  projectName: string;

  constructor(task: CloudRunTask) {
    super();
    this.success = task.status === 0;
    this.projectName = task.projectName;
  }
}
export class NxCloudTaskTreeItem extends TreeItem {
  constructor(treeData: NxCloudTaskTreeData) {
    super(treeData.projectName, TreeItemCollapsibleState.None);
    this.iconPath = this.iconPath = new ThemeIcon(
      treeData.success ? 'pass' : 'stop',
      new ThemeColor(
        treeData.success ? 'testing.iconPassed' : 'testing.iconFailed'
      )
    );
  }
}
