import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { request } from 'graphql-request';
import { commands } from 'vscode';
import { CloudRun } from './cloud-run.model';
import { NxCloudRunsTreeItem } from './nx-cloud-runs-tree-item';

const REFRESH_CLOUD_RUNS_COMMAND = 'nxConsole.cloud.refreshCloudRuns';
export class NxCloudRunsProvider extends AbstractTreeProvider<NxCloudRunsTreeItem> {
  constructor() {
    super();
    commands.registerCommand(REFRESH_CLOUD_RUNS_COMMAND, () => this.refresh());
  }
  async getChildren(
    element?: NxCloudRunsTreeItem | undefined
  ): Promise<NxCloudRunsTreeItem[] | null | undefined> {
    const cloudRuns = await this.getCloudRuns();
    return cloudRuns.map((cloudRun) => new NxCloudRunsTreeItem(cloudRun));
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
