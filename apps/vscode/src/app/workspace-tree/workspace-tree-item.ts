import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, TreeView, Uri } from 'vscode';

export type WorkspaceRouteTitle =
  | 'Add'
  | 'Build'
  | 'E2e'
  | 'Generate'
  | 'Lint'
  | 'Run'
  | 'Serve'
  | 'Test'
  | 'Change workspace'
  | 'Select workspace';

const ROUTE_TO_ICON_MAP = new Map<WorkspaceRouteTitle | undefined, string>([
  ['Add', 'angular-cli.svg'],
  ['Build', 'angular-cli.svg'],
  ['E2e', 'angular-cli.svg'],
  ['Generate', 'angular-cli.svg'],
  ['Lint', 'angular-cli.svg'],
  ['Run', 'angular-cli.svg'],
  ['Serve', 'angular-cli.svg'],
  ['Test', 'angular-cli.svg']
]);

export const ROUTE_LIST: WorkspaceRouteTitle[] = [
  'Add',
  'Build',
  'E2e',
  'Generate',
  'Lint',
  'Run',
  'Serve',
  'Test'
];

export class WorkspaceTreeItem extends TreeItem {
  revealWorkspaceRoute(currentWorkspace: TreeView<WorkspaceTreeItem>) {
    (currentWorkspace.visible
      ? currentWorkspace.reveal(this, {
          select: true,
          focus: true
        })
      : Promise.reject()
    ).then(() => {}, () => {}); // Explicitly handle rejection
  }

  command = {
    title: this.route,
    command: 'nxConsole.revealWebViewPanel',
    tooltip: '',
    arguments: [this]
  };

  iconPath = WorkspaceTreeItem.getIconUriForRoute(
    this.extensionPath,
    this.route
  );

  label: WorkspaceRouteTitle;

  constructor(
    readonly workspaceJsonPath: string,
    readonly route: WorkspaceRouteTitle,
    readonly extensionPath: string
  ) {
    super(route, TreeItemCollapsibleState.None);
  }

  static getIconUriForRoute(
    extensionPath: string,
    route?: WorkspaceRouteTitle
  ): Uri | undefined {
    const icon = ROUTE_TO_ICON_MAP.get(route);
    return icon ? Uri.file(join(extensionPath, 'assets', icon)) : undefined;
  }
}
