import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
} from 'vscode';

export abstract class AbstractTreeProvider<Item extends TreeItem>
  implements TreeDataProvider<Item>
{
  private readonly _onDidChangeTreeData: EventEmitter<Item | undefined> =
    new EventEmitter();
  readonly onDidChangeTreeData: Event<Item | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Item): TreeItem {
    return element;
  }

  abstract getParent(element: Item): ProviderResult<Item | null | undefined>;
  abstract getChildren(element?: Item): ProviderResult<Item[]>;
}
