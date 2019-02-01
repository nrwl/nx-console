import { Uri, TreeItemCollapsibleState, TreeItem } from 'vscode';
import { join } from 'path';
import { WorkspaceDefinition } from '@angular-console/server';

export class Workspace extends TreeItem {
  iconPath = Uri.file(join(this.extensionPath, 'assets', 'extension_icon.png'));

  tooltip = this.workspaceDefinition.path;

  constructor(
    readonly workspaceDefinition: WorkspaceDefinition,
    readonly extensionPath: string
  ) {
    super(workspaceDefinition.name, TreeItemCollapsibleState.Collapsed);
  }
}
