import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { request } from 'graphql-request';
import {
  commands,
  EventEmitter,
  TreeDataProvider,
  Event,
  TreeItem,
} from 'vscode';
import { CloudRun } from './cloud-run.model';
import {
  NxCloudRunDetailsTreeData,
  NxCloudRunDetailsTreeItem,
} from './tree/nx-cloud-run-details';
import { NxCloudRunTreeData, NxCloudRunTreeItem } from './tree/nx-cloud-run';
import { NxCloudTaskTreeData, NxCloudTaskTreeItem } from './tree/nx-cloud-task';
import {
  NxCloudTasksPlaceholderTreeData,
  NxCloudTasksPlaceholderTreeItem,
} from './tree/nx-cloud-tasks-placeholder';
import { NxCloudTreeDataBase } from './tree/nx-cloud-tree-data-base';
import { NxCloudApiService } from './nx-cloud-api-service';
import {
  LOAD_MORE_CLOUD_RUNS_COMMAND,
  NxCloudLoadMoreRunsTreeData,
  NxCloudLoadMoreRunsTreeItem,
} from './tree/nx-cloud-load-more-runs';

const REFRESH_CLOUD_RUNS_COMMAND = 'nxConsole.cloud.refreshCloudRuns';

export class NxCloudRunsProvider
  implements TreeDataProvider<NxCloudTreeDataBase>
{
  private cloudApiService = new NxCloudApiService();

  constructor() {
    commands.registerCommand(REFRESH_CLOUD_RUNS_COMMAND, () => this.refresh());
    commands.registerCommand(LOAD_MORE_CLOUD_RUNS_COMMAND, () =>
      this.loadMoreCloudRuns()
    );
  }

  async getChildren(
    treeData?: NxCloudTreeDataBase | undefined
  ): Promise<NxCloudTreeDataBase[] | null | undefined> {
    if (!treeData) {
      let cloudRuns = this.cloudApiService.getCloudRuns();
      if (cloudRuns.length === 0) {
        cloudRuns = await this.cloudApiService.loadMoreCloudRuns();
      }
      const cloudRunData = cloudRuns.map(
        (cloudRun) => new NxCloudRunTreeData(cloudRun)
      );
      return [...cloudRunData, new NxCloudLoadMoreRunsTreeData()];
    }
    if (treeData.instanceOf(NxCloudRunTreeData)) {
      const children = [];
      children.push(new NxCloudRunDetailsTreeData(treeData.cloudRun));
      if (treeData.cloudRun.tasks.length > 0) {
        children.push(new NxCloudTasksPlaceholderTreeData(treeData));
      }
      return children;
    }
    if (treeData.instanceOf(NxCloudTasksPlaceholderTreeData)) {
      return treeData.parent.getTasks();
    }
  }

  getTreeItem(treeData: NxCloudTreeDataBase): TreeItem {
    if (treeData.instanceOf(NxCloudRunTreeData)) {
      return new NxCloudRunTreeItem(treeData);
    }
    if (treeData.instanceOf(NxCloudRunDetailsTreeData)) {
      return new NxCloudRunDetailsTreeItem(treeData);
    }
    if (treeData.instanceOf(NxCloudTasksPlaceholderTreeData)) {
      return new NxCloudTasksPlaceholderTreeItem(treeData);
    }
    if (treeData.instanceOf(NxCloudTaskTreeData)) {
      return new NxCloudTaskTreeItem(treeData);
    }
    return new NxCloudLoadMoreRunsTreeItem(
      treeData as NxCloudLoadMoreRunsTreeData
    );
  }

  async loadMoreCloudRuns(): Promise<void> {
    await this.cloudApiService.loadMoreCloudRuns();
    this._onDidChangeTreeData.fire(undefined);
  }

  // refresh handling
  private readonly _onDidChangeTreeData: EventEmitter<
    NxCloudTreeDataBase | undefined
  > = new EventEmitter();
  readonly onDidChangeTreeData: Event<NxCloudTreeDataBase | undefined> =
    this._onDidChangeTreeData.event;

  async refresh(): Promise<void> {
    this.cloudApiService.reset();
    await this.cloudApiService.loadMoreCloudRuns();
    this._onDidChangeTreeData.fire(undefined);
  }
}
