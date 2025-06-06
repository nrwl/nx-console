import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  ProviderResult,
} from 'vscode';

export abstract class AbstractTreeProvider<Item extends TreeItem>
  implements TreeDataProvider<Item>
{
  private readonly _onDidChangeTreeData: EventEmitter<Item | undefined> =
    new EventEmitter();
  readonly onDidChangeTreeData: Event<Item | undefined> =
    this._onDidChangeTreeData.event;

  refresh(item?: Item): void {
    this._onDidChangeTreeData.fire(item);
  }

  getTreeItem(element: Item): TreeItem {
    return element;
  }

  abstract getParent(element: Item): ProviderResult<Item | null | undefined>;
  abstract getChildren(element?: Item): ProviderResult<Item[]>;
}
