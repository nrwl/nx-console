import { AbstractTreeProvider } from '@nx-console/server';
import { NxCommandsTreeItem } from './nx-commands-tree-item';
import { ExtensionContext } from 'vscode';

export class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
  }

  getParent(_: NxCommandsTreeItem) {
    return null;
  }

  getChildren() {
    return [
      'dep-graph',
      'run-many',
      'affected',
      'affected:apps',
      'affected:build',
      'affected:dep-graph',
      'affected:e2e',
      'affected:libs',
      'affected:lint',
      'affected:test',
      'list',
      'migrate',
    ].map((c) => new NxCommandsTreeItem(c, this.context.extensionPath));
  }
}
