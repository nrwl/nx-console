import {
  EXTENSIONS,
  readAllSchematicCollections
} from '@angular-console/server';
import { join } from 'path';
import {
  QuickPickItem,
  TreeItem,
  TreeItemCollapsibleState,
  TreeView,
  Uri,
  window
} from 'vscode';

import { ProjectDef } from '../ng-task/ng-task-definition';

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
  | 'Dep-Graph'
  | 'Connect'
  | 'Settings'
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
  ['Dep-Graph', 'affected-projects.svg'],
  ['Connect', 'Nrwl_ColorIcon.svg'],
  ['Settings', 'gear.svg'],
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
  'Xi18n',
  'Dep-Graph',
  'Connect',
  'Settings'
] as WorkspaceRouteTitle[];

export class WorkspaceTreeItem extends TreeItem {
  revealWorkspaceRoute: RevealWorkspaceRoute = currentWorkspace => {
    revealWorkspaceRouteIfVisible(currentWorkspace, this).then(
      () => {},
      () => {}
    ); // Explicitly handle rejection
  };

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

export type RevealWorkspaceRoute = (
  currentWorkspace: TreeView<WorkspaceTreeItem>
) => void;

export function revealWorkspaceRouteIfVisible(
  treeView: TreeView<WorkspaceTreeItem>,
  item: WorkspaceTreeItem
): Thenable<void> {
  return treeView.visible
    ? treeView.reveal(item, {
        select: true,
        focus: true
      })
    : Promise.reject();
}

class NgTaskQuickPickItem implements QuickPickItem {
  constructor(
    readonly project: string,
    readonly command: string,
    readonly label: string
  ) {}
}

export async function getWorkspaceRoute(
  workspacePath: string,
  getProjectEntries: () => [string, ProjectDef][],
  workspaceRouteTitle: WorkspaceRouteTitle = 'Run',
  projectName?: string
): Promise<string | undefined> {
  if (!workspacePath) {
    return;
  }

  const command = workspaceRouteTitle.toLowerCase();
  switch (workspaceRouteTitle) {
    case 'Build':
    case 'Deploy':
    case 'E2e':
    case 'Lint':
    case 'Serve':
    case 'Test':
    case 'Xi18n':
      const items = getProjectEntries()
        .filter(([_, { architect }]) => Boolean(architect))
        .flatMap(([project, { architect }]) => ({ project, architect }))
        .filter(({ architect }) => Boolean(architect && architect[command]))
        .map(
          ({ project }) => new NgTaskQuickPickItem(project, command, project)
        );

      if (!items.length) {
        window.showInformationMessage(
          `None of your projects support ng ${command}`
        );

        return '';
      }

      if (!projectName) {
        const selection = await window.showQuickPick(items);
        if (!selection) return;

        projectName = selection.project;
      }

      if (!projectName) return;

      return `workspace/${encodeURIComponent(
        workspacePath
      )}/projects/task/${command}/${projectName}`;

    case 'Run':
      const runnableItems = getProjectEntries()
        .filter(([_, { architect }]) => Boolean(architect))
        .flatMap(([project, { architect }]) => ({ project, architect }))
        .flatMap(({ project, architect }) => [
          ...Object.keys(architect!).map(architectName => ({
            project,
            architectName
          }))
        ])
        .map(
          ({ project, architectName }) =>
            new NgTaskQuickPickItem(
              project,
              architectName,
              `${project}:${architectName}`
            )
        );

      return window
        .showQuickPick(runnableItems)
        .then(selection =>
          selection
            ? `workspace/${encodeURIComponent(workspacePath)}/projects/task/${
                selection.command
              }/${selection.project}`
            : ''
        );
    case 'Connect':
      return 'connect/support';
    case 'Dep-Graph':
      return `workspace/${encodeURIComponent(
        workspacePath
      )}/connect/affected-projects`;
    case 'Add':
      const extensions = Object.entries(EXTENSIONS).map(
        ([label, description]): QuickPickItem => ({
          label,
          description
        })
      );
      return window
        .showQuickPick(extensions)
        .then(
          (selection): string =>
            `workspace/${encodeURIComponent(workspacePath)}/extensions${
              selection ? `/${encodeURIComponent(selection.label)}` : ''
            }`
        );
    case 'Generate':
      interface GenerateQuickPickItem extends QuickPickItem {
        collectionName: string;
        schematicName: string;
      }

      const schematics = readAllSchematicCollections(
        workspacePath,
        'tools/schematics', // TODO: Make these values auto detectable / configurable
        'workspace-schematic' // TODO: Make these values auto detectable / configurable
      )
        .map(
          (c): GenerateQuickPickItem[] =>
            c.schematics.map(
              (s): GenerateQuickPickItem => ({
                description: s.description,
                label: `${c.name} - ${s.name}`,
                collectionName: c.name,
                schematicName: s.name
              })
            )
        )
        .flat();

      return window
        .showQuickPick(schematics)
        .then(
          (selection): string =>
            `workspace/${encodeURIComponent(workspacePath)}/generate${
              selection
                ? `/${encodeURIComponent(
                    selection.collectionName
                  )}/${encodeURIComponent(selection.schematicName)}`
                : ''
            }`
        );
    case 'Settings':
      return `workspace/${encodeURIComponent(
        workspacePath
      )}/${workspaceRouteTitle.replace(/ /g, '-').toLowerCase()}`;
  }
}
