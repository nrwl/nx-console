import { AbstractTreeProvider } from '../abstract-tree-provider';
import { AffectedTreeItem } from './affected-tree-item';
import { ExtensionContext } from 'vscode';

export class AffectedTreeProvider extends AbstractTreeProvider<
  AffectedTreeItem
> {
  static create(context: ExtensionContext): AffectedTreeProvider {
    return new AffectedTreeProvider(context);
  }

  private constructor(private context: ExtensionContext) {
    super();
  }

  getParent(_: AffectedTreeItem) {
    return null;
  }

  getChildren() {
    return [
      'affected',
      'affected:apps',
      'affected:build',
      'affected:dep-graph',
      'affected:e2e',
      'affected:libs',
      'affected:lint',
      'affected:test'
    ].map(c => new AffectedTreeItem(c, this.context.extensionPath));
  }
}
