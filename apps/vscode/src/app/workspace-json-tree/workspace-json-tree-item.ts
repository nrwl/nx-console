import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class WorkspaceJsonTreeItem extends TreeItem {
  constructor(
    public workspaceJsonLabel: WorkspaceJsonLabel,
    treeItemLabel: string,
    collapsibleState?: TreeItemCollapsibleState | undefined
  ) {
    super(treeItemLabel, collapsibleState);

    if (collapsibleState) {
      this.command = {
        title: 'Expand/contract item in workspace tree',
        command: 'nxConsole.toggleTreeItem'
      };
    }
  }
}

export interface WorkspaceJsonLabel {
  project: string;
  architect?: {
    name: string;
    configuration?: string;
  };
}
