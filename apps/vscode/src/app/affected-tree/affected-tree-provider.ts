import { AbstractTreeProvider } from '../abstract-tree-provider';
import { AffectedTreeItem } from './affected-tree-item';

export class AffectedTreeProvider extends AbstractTreeProvider<
  AffectedTreeItem
> {
  static create(): AffectedTreeProvider {
    return new AffectedTreeProvider();
  }

  private constructor() {
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
    ].map(c => new AffectedTreeItem(c));
  }
}
