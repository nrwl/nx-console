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
  | 'Dependency Diagram'
  | 'Generate'
  | 'Tasks'
  | 'Connect'
  | 'Extensions'
  | 'Settings';

const ROUTE_TO_ICON_MAP = new Map<WorkspaceRouteTitle | undefined, string>([
  ['Projects', 'angular-logo.svg'],
  ['Generate', 'computing.svg'],
  ['Tasks', 'running_process2.svg'],
  ['Extensions', 'plugin.svg'],
  ['Dependency Diagram', 'affected-projects.svg'],
  ['Connect', 'Nrwl_ColorIcon.svg'],
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
  const workspacePath = workspaceDef
    ? workspaceDef.path
    : workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;

  switch (workspaceRouteTitle) {
    case 'Workspaces':
      return 'workspaces';
    case 'Connect':
      return 'connect/support';
    case 'Dependency Diagram':
      if (workspacePath) {
        return `workspace/${encodeURIComponent(
          workspacePath
        )}/connect/affected-projects`;
      } else {
        return 'workspaces';
      }
    case 'Projects':
    case 'Extensions':
    case 'Tasks':
    case 'Settings':
    case 'Generate':
      if (workspacePath) {
        return `workspace/${encodeURIComponent(
          workspacePath
        )}/${workspaceRouteTitle.replace(/ /g, '-').toLowerCase()}`;
      }
  }

  return 'workspaces';
}
