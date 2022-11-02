import request from 'graphql-request';
import { CloudRun } from './cloud-run.model';

export class NxCloudApiService {
  private readonly endpoint = 'https://cloud.nx.app/api';

  private cloudRuns: CloudRun[] = [];
  private currentPage = 0;

  getCloudRuns(): CloudRun[] {
    return this.cloudRuns;
  }

  reset(): void {
    this.cloudRuns = [];
  }

  async loadMoreCloudRuns(): Promise<CloudRun[]> {
    const query = `
    query GetRunListPage(
      $workspaceId: ID!
    ) {
       workspaces(workspaceId: $workspaceId) {
        runListPage(
          limit: 10
          offset: ${this.currentPage * 10}
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
    }>(this.endpoint, query, variables);

    this.currentPage++;

    this.cloudRuns.push(...data.workspaces[0].runListPage.runs);

    return this.cloudRuns;
  }
}
