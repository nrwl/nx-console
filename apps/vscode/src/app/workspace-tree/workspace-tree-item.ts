import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, TreeView, Uri } from 'vscode';

export type WorkspaceRouteTitle =
  | 'Generate'
  | 'Run'
  | 'Build'
  | 'Serve'
  | 'Test'
  | 'E2e'
  | 'Lint'
  | 'Change workspace'
  | 'Select workspace';

const ROUTE_TO_ICON_MAP = new Map<WorkspaceRouteTitle | undefined, string>([
  ['Generate', 'nx-cli.svg'],
  ['Run', 'nx-cli.svg'],
  ['Build', 'nx-cli.svg'],
  ['Serve', 'nx-cli.svg'],
  ['Test', 'nx-cli.svg'],
  ['E2e', 'nx-cli.svg'],
  ['Lint', 'nx-cli.svg']
]);

export const ROUTE_LIST: WorkspaceRouteTitle[] = [
  'Generate',
  'Run',
  'Build',
  'Serve',
  'Test',
  'E2e',
  'Lint'
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
