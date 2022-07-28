import { AbstractTreeProvider } from '@nx-console/utils';
import { NxCommandsTreeItem } from './nx-commands-tree-item';
import { ExtensionContext } from 'vscode';

export class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getParent(_: NxCommandsTreeItem) {
    return null;
  }

  getChildren() {
    return [
      'run-many',
      'affected',
      'affected:apps',
      'affected:build',
      'affected:e2e',
      'affected:libs',
      'affected:lint',
      'affected:test',
      'list',
      'migrate',
    ].map((c) => new NxCommandsTreeItem(c, this.context.extensionPath));
  }
}
