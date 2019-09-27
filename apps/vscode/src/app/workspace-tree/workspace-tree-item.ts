import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, TreeView, Uri } from 'vscode';

export type WorkspaceRouteTitle =
  | 'Add'
  | 'Build'
  | 'Deploy'
  | 'E2e'
  | 'Generate'
  | 'Lint'
  | 'Run'
  | 'Serve'
  | 'Test'
  | 'Xi18n'
  | 'Select angular.json';

const ROUTE_TO_ICON_MAP = new Map<WorkspaceRouteTitle | undefined, string>([
  ['Add', 'angular-cli.svg'],
  ['Build', 'angular-cli.svg'],
  ['Deploy', 'angular-cli.svg'],
  ['E2e', 'angular-cli.svg'],
  ['Generate', 'angular-cli.svg'],
  ['Lint', 'angular-cli.svg'],
  ['Run', 'angular-cli.svg'],
  ['Serve', 'angular-cli.svg'],
  ['Test', 'angular-cli.svg'],
  ['Xi18n', 'angular-cli.svg'],
  ['Select angular.json', 'extension_icon.png']
]);

export const ROUTE_LIST = [
  'Add',
  'Build',
  'Deploy',
  'E2e',
  'Generate',
  'Lint',
  'Run',
  'Serve',
  'Test',
  'Xi18n'
] as WorkspaceRouteTitle[];

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
    command: 'angularConsole.revealWebViewPanel',
    tooltip: '',
    arguments: [this]
  };

  iconPath = WorkspaceTreeItem.getIconUriForRoute(
    this.extensionPath,
    this.route
  );

  label: WorkspaceRouteTitle;

  constructor(
    readonly workspacePath: string,
    readonly route: WorkspaceRouteTitle,
    readonly extensionPath: string,
    readonly projectName?: string
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
