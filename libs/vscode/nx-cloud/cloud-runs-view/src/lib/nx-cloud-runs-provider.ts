import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { request } from 'graphql-request';
import { commands, EventEmitter, TreeDataProvider, Event } from 'vscode';
import { CloudRun } from './cloud-run.model';
import { NxCloudRunDetailsTreeItem } from './nx-cloud-run-details-tree-item';
import { NxCloudRunTreeItem } from './nx-cloud-run-tree-item';
import { NxCloudTaskTreeItem } from './nx-cloud-task-tree-item';
import { NxCloudTasksPlaceholderTreeItem } from './nx-cloud-tasks-placeholder-tree-item';

const REFRESH_CLOUD_RUNS_COMMAND = 'nxConsole.cloud.refreshCloudRuns';

export type NxCloudTreeItems =
  | NxCloudRunTreeItem
  | NxCloudRunDetailsTreeItem
  | NxCloudTasksPlaceholderTreeItem
  | NxCloudTaskTreeItem;
export class NxCloudRunsProvider extends AbstractTreeProvider<NxCloudTreeItems> {
  constructor() {
    super();
    commands.registerCommand(REFRESH_CLOUD_RUNS_COMMAND, () => this.refresh());
  }

  // TODO: REFACTOR TO USE SEPARATE DATA CLASSES AND TREE ITEMS
  async getChildren(
    element?: NxCloudRunTreeItem | undefined
  ): Promise<NxCloudTreeItems[] | null | undefined> {
    if (!element) {
      const cloudRuns = await this.getCloudRuns();
      return cloudRuns.map((cloudRun) => new NxCloudRunTreeItem(cloudRun));
    }
    if (element.type === 'NxCloudRunTreeItem') {
      const children = [];
      children.push(new NxCloudRunDetailsTreeItem(element.cloudRun));
      if (element.cloudRun.tasks.length > 0) {
        children.push(new NxCloudTasksPlaceholderTreeItem(element));
      }
      return children;
    }
    if (element instanceof NxCloudTasksPlaceholderTreeItem) {
      return element.parent.getTasks();
    }
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
