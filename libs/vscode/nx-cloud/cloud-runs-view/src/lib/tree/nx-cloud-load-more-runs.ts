import { TreeItem } from 'vscode';
import { NxCloudTreeDataBase } from './nx-cloud-tree-data-base';

export const LOAD_MORE_CLOUD_RUNS_COMMAND = 'nxConsole.cloud.loadMoreCloudRuns';

export class NxCloudLoadMoreRunsTreeData extends NxCloudTreeDataBase {
  readonly type = 'NxCloudLoadMoreRuns';

  constructor() {
    super();
  }
}

export class NxCloudLoadMoreRunsTreeItem extends TreeItem {
  constructor(_: NxCloudLoadMoreRunsTreeData) {
    super('Load More Runs...');
    this.command = {
      command: LOAD_MORE_CLOUD_RUNS_COMMAND,
      title: 'Load More Runs',
    };
  }
}
