import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import {
  ExtensionContext,
  TreeItemCollapsibleState,
  TreeView,
  TreeViewExpansionEvent,
} from 'vscode';
import { NxTreeItem } from './nx-tree-item';

export function listenForAndStoreCollapsibleChanges(
  nxProjectTreeView: TreeView<NxTreeItem>,
  context: ExtensionContext
) {
  nxProjectTreeView.onDidCollapseElement(
    (event: TreeViewExpansionEvent<NxTreeItem>) =>
      TreeItemCollapsibleStore.instance.storeCollapsibleStateChange(
        event.element.id,
        TreeItemCollapsibleState.Collapsed
      ),
    context.subscriptions
  );
  nxProjectTreeView.onDidExpandElement(
    (event: TreeViewExpansionEvent<NxTreeItem>) =>
      TreeItemCollapsibleStore.instance.storeCollapsibleStateChange(
        event.element.id,
        TreeItemCollapsibleState.Expanded
      ),
    context.subscriptions
  );
}

export function getStoredCollapsibleState(treeItemId: string) {
  return TreeItemCollapsibleStore.instance.getStoredCollapsibleState(
    treeItemId
  );
}

class TreeItemCollapsibleStore {
  private static _instance: TreeItemCollapsibleStore;
  private workspaceStore: WorkspaceConfigurationStore;
  private collapsibleMap: Map<string, TreeItemCollapsibleState>;

  static get instance() {
    if (!TreeItemCollapsibleStore._instance) {
      TreeItemCollapsibleStore._instance = new TreeItemCollapsibleStore();
    }
    return this._instance;
  }

  constructor() {
    this.workspaceStore = WorkspaceConfigurationStore.instance;
    this.collapsibleMap = this.readAndDeserializeCollapsibleMap();
  }

  getStoredCollapsibleState(
    treeItemId: string
  ): TreeItemCollapsibleState | undefined {
    return this.collapsibleMap.get(treeItemId);
  }

  storeCollapsibleStateChange(
    treeItemId: string,
    targetState: TreeItemCollapsibleState
  ) {
    if (targetState === TreeItemCollapsibleState.Collapsed) {
      this.collapsibleMap.delete(treeItemId);
    } else {
      this.collapsibleMap.set(treeItemId, targetState);
    }
    this.serializeAndStoreCollapsibleMap();
  }

  private serializeAndStoreCollapsibleMap() {
    const serializedMap = JSON.stringify(
      Array.from(this.collapsibleMap.entries())
    );
    this.workspaceStore.set('projectsViewCollapsibleState', serializedMap);
  }

  private readAndDeserializeCollapsibleMap(): Map<
    string,
    TreeItemCollapsibleState
  > {
    const serializedMap = this.workspaceStore.get(
      'projectsViewCollapsibleState',
      '[]'
    );
    const deserializedMap = new Map<string, TreeItemCollapsibleState>(
      JSON.parse(serializedMap)
    );

    return deserializedMap;
  }
}
