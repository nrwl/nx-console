import { GeneratorType } from '@nx-console/shared/schema';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, TreeView, Uri } from 'vscode';

const LIGHT_SVG_URL = 'nx-cli-light.svg';
const DARK_SVG_URL = 'nx-cli-dark.svg';

export const commandList = async (): Promise<string[]> => {
  const defaultCommands = ['generate', 'run'];
  const workspaceSpecificTargetNames = await getTargetNames();
  return [...defaultCommands, ...workspaceSpecificTargetNames];
};

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

  iconPath = RunTargetTreeItem.getIconUriForRoute(this.extensionPath);

  label: string;

  constructor(
    readonly route: string,
    readonly extensionPath: string,
    readonly generatorType?: GeneratorType,
    readonly generator?: string
  ) {
    super(route, TreeItemCollapsibleState.None);
  }

  static getIconUriForRoute(
    extensionPath: string
  ): { light: Uri; dark: Uri } | undefined {
    return {
      light: Uri.file(join(extensionPath, 'assets', LIGHT_SVG_URL)),
      dark: Uri.file(join(extensionPath, 'assets', DARK_SVG_URL)),
    };
  }
}

async function getTargetNames(): Promise<string[]> {
  const { workspace } = await getNxWorkspace();
  const commands = Object.values(workspace.projects).reduce((acc, project) => {
    for (const target of Object.keys(project.targets ?? {})) {
      acc.add(target);
    }
    return acc;
  }, new Set<string>());
  return Array.from(commands);
}
