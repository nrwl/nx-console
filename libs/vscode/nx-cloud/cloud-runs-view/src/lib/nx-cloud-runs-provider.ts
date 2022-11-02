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

const REFRESH_CLOUD_RUNS_COMMAND = 'nxConsole.cloud.refreshCloudRuns';

export class NxCloudRunsProvider
  implements TreeDataProvider<NxCloudTreeDataBase>
{
  constructor() {
    commands.registerCommand(REFRESH_CLOUD_RUNS_COMMAND, () => this.refresh());
  }

  // TODO: REFACTOR TO USE SEPARATE DATA CLASSES AND TREE ITEMS
  async getChildren(
    treeData?: NxCloudTreeDataBase | undefined
  ): Promise<NxCloudTreeDataBase[] | null | undefined> {
    if (!treeData) {
      const cloudRuns = await this.getCloudRuns();
      return cloudRuns.map((cloudRun) => new NxCloudRunTreeData(cloudRun));
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
    return new NxCloudTaskTreeItem(treeData as NxCloudTaskTreeData);
  }

  // refresh handling
  private readonly _onDidChangeTreeData: EventEmitter<
    NxCloudTreeDataBase | undefined
  > = new EventEmitter();
  readonly onDidChangeTreeData: Event<NxCloudTreeDataBase | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  async getCloudRuns(): Promise<CloudRun[]> {
    const endpoint = 'https://cloud.nx.app/api';
    const query = `
    query GetRunListPage(
      $workspaceId: ID!
    ) {
       workspaces(workspaceId: $workspaceId) {
        runListPage(
          limit: 10
          offset: 0
          orphans: false
          status: ""
          branch: ""
        ) {
          hasNext
          pageCount
          offset
          limit
          orphans
          runs {
            linkId
            workspaceId
            command
            startTime
            endTime
            branch
            runGroup
            tasks {
              status
              projectName
            }
          }
        }
      }
    }`;
    const variables = {
      workspaceId: '60391f45cfedf9713ddaa491',
    };
    const data = await request<{
      workspaces: { runListPage: { runs: CloudRun[] } }[];
    }>(endpoint, query, variables);
    console.log(data);
    return data.workspaces[0].runListPage.runs;
  }
}
