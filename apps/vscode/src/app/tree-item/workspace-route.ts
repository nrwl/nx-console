import { WorkspaceDefinition } from '@angular-console/schema';
import { join } from 'path';
import {
  TreeItem,
  TreeItemCollapsibleState,
  TreeView,
  Uri,
  workspace
} from 'vscode';

import { Workspace } from './workspace';

export type WorkspaceRouteTitle =
  | 'Workspaces'
  | 'Projects'
  | 'Affected Projects'
  | 'Generate'
  | 'Tasks'
  | 'Connect'
  | 'Extensions'
  | 'Settings';

const ROUTE_TO_ICON_MAP = new Map<WorkspaceRouteTitle | undefined, string>([
  ['Projects', 'angular-logo.svg'],
  ['Affected Projects', 'affected-projects.svg'],
  ['Generate', 'computing.svg'],
  ['Tasks', 'running_process2.svg'],
  ['Connect', 'Nrwl_ColorIcon.svg'],
  ['Extensions', 'plugin.svg'],
  ['Settings', 'gear.svg']
]);

export class WorkspaceRoute extends TreeItem {
  revealWorkspaceRoute: RevealWorkspaceRoute = currentWorkspace => {
    revealWorkspaceRouteIfVisible(currentWorkspace, this).then(
      () => {},
      () => {}
    ); // Explicitly handle rejection
  };

  command = {
    title: this.route,
    command: 'extension.angularConsoleActivePanel',
    tooltip: '',
    arguments: [
      this.workspaceDefinition,
      this.route,
      this.revealWorkspaceRoute.bind(this)
    ]
  };

  iconPath = WorkspaceRoute.getIconUriForRoute(this.extensionPath, this.route);

  constructor(
    readonly workspaceDefinition: WorkspaceDefinition | undefined,
    readonly route: WorkspaceRouteTitle,
    readonly extensionPath: string
  ) {
    super(route, TreeItemCollapsibleState.None);
  }

  static getIconUriForRoute(
    extensionPath: string,
    route?: WorkspaceRouteTitle
  ): Uri {
    return Uri.file(
      join(
        extensionPath,
        'assets',
        ROUTE_TO_ICON_MAP.get(route) || 'extension_icon.png'
      )
    );
  }
}

export type RevealWorkspaceRoute = (
  currentWorkspace: TreeView<Workspace | WorkspaceRoute>
) => void;

export function revealWorkspaceRouteIfVisible(
  treeView: TreeView<WorkspaceRoute | Workspace>,
  item: WorkspaceRoute
): Thenable<void> {
  return treeView.visible
    ? treeView.reveal(item, {
        select: true,
        focus: true
      })
    : Promise.reject();
}

export function getWorkspaceRoute(
  workspaceDef: WorkspaceDefinition | undefined,
  workspaceRouteTitle: WorkspaceRouteTitle = 'Projects'
): string {
  switch (workspaceRouteTitle) {
    case 'Workspaces':
      return 'workspaces';
    case 'Connect':
      return 'connect';
    case 'Projects':
    case 'Extensions':
    case 'Tasks':
    case 'Affected Projects':
    case 'Settings':
    case 'Generate':
      const workspacePath = workspaceDef
        ? workspaceDef.path
        : workspace.workspaceFolders &&
          workspace.workspaceFolders[0].uri.fsPath;

      if (workspacePath) {
        return `workspace/${encodeURIComponent(
          workspacePath
        )}/${workspaceRouteTitle.replace(/ /g, '-').toLowerCase()}`;
      }
  }

  return 'workspaces';
}
