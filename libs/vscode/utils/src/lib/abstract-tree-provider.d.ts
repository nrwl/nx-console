import { Event, TreeDataProvider, TreeItem, ProviderResult } from 'vscode';
export declare abstract class AbstractTreeProvider<Item extends TreeItem> implements TreeDataProvider<Item> {
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<Item | undefined>;
    refresh(): void;
    getTreeItem(element: Item): TreeItem;
    abstract getParent(element: Item): ProviderResult<Item | null | undefined>;
    abstract getChildren(element?: Item): ProviderResult<Item[]>;
}
