import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, ProviderResult } from 'vscode';
import { CloudRun } from './cloud-run.model';
import { NxCloudRunsTreeItem } from './nx-cloud-runs-tree-item';

const REFRESH_CLOUD_RUNS_COMMAND = 'nxConsole.cloud.refreshCloudRuns';
export class NxCloudRunsProvider extends AbstractTreeProvider<NxCloudRunsTreeItem> {
  constructor() {
    super();
    commands.registerCommand(REFRESH_CLOUD_RUNS_COMMAND, () => this.refresh());
  }
  getChildren(
    element?: NxCloudRunsTreeItem | undefined
  ): ProviderResult<NxCloudRunsTreeItem[]> {
    return this.getCloudRuns().map(this.mapCloudRunToTreeItem);
  }

  getCloudRuns(): CloudRun[] {
    const runs: CloudRun[] = [];
    const n = Math.floor(Math.random() * 10);
    for (let i = 0; i < n; i++) {
      const id = Math.floor(Math.random() * 100000).toString();
      runs.push({
        id,
        command: `nx run ${id}`,
        success: Boolean(Math.round(Math.random())),
      });
    }
    return runs;
  }

  mapCloudRunToTreeItem(cloudRun: CloudRun): NxCloudRunsTreeItem {
    return new NxCloudRunsTreeItem(cloudRun.command, cloudRun.success);
  }
}
