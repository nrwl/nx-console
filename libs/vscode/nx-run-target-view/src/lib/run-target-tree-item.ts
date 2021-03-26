import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, TreeView, Uri } from 'vscode';

export type WorkspaceRouteTitle =
  | 'Generate'
  | 'Run'
  | 'Build'
  | 'Serve'
  | 'Test'
  | 'E2E'
  | 'Lint';

const ROUTE_TO_ICON_MAP = new Map<
  WorkspaceRouteTitle | undefined,
  { light: string; dark: string }
>([
  ['Generate', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
  ['Run', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
  ['Build', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
  ['Serve', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
  ['Test', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
  ['E2E', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
  ['Lint', { light: 'nx-cli-light.svg', dark: 'nx-cli-dark.svg' }],
]);

export const ROUTE_LIST: WorkspaceRouteTitle[] = [
  'Generate',
  'Run',
  'Build',
  'Serve',
  'Test',
  'E2E',
  'Lint',
];

export class RunTargetTreeItem extends TreeItem {
  revealWorkspaceRoute(currentWorkspace: TreeView<RunTargetTreeItem>) {
    (currentWorkspace.visible
      ? currentWorkspace.reveal(this, {
          select: true,
          focus: true,
        })
      : Promise.reject()
    ).then(
      () => {
        // empty
      },
      () => {
        // empty
      }
    ); // Explicitly handle rejection
  }

  command: {
    title: string;
    command: string;
    tooltip: string;
    arguments: any;
  } = {
    title: this.route,
    command: 'nxConsole.revealWebViewPanel',
    tooltip: '',
    arguments: [this],
  };

  iconPath = RunTargetTreeItem.getIconUriForRoute(
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
  ): { light: Uri; dark: Uri } | undefined {
    const icon = ROUTE_TO_ICON_MAP.get(route);
    return icon
      ? {
          light: Uri.file(join(extensionPath, 'assets', icon.light)),
          dark: Uri.file(join(extensionPath, 'assets', icon.dark)),
        }
      : undefined;
  }
}
