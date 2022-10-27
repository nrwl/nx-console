import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { ProviderResult } from 'vscode';
import { NxCloudRunsTreeItem } from './nx-cloud-runs-tree-item';

export class NxCloudRunsProvider extends AbstractTreeProvider<NxCloudRunsTreeItem> {
  getChildren(
    element?: NxCloudRunsTreeItem | undefined
  ): ProviderResult<NxCloudRunsTreeItem[]> {
    return [new NxCloudRunsTreeItem('1'), new NxCloudRunsTreeItem('2')];
  }
}
