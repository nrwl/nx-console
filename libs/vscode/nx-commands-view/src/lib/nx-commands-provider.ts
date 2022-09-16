import { AbstractTreeProvider } from '@nx-console/vscode/utils';
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
      'Add Dependency',
      'Add Dev Dependency',
    ].map((c) => new NxCommandsTreeItem(c, this.context.extensionPath));
  }
}
