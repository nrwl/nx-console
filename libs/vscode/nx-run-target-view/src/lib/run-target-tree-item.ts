import { GeneratorType } from '@nx-console/shared/schema';
import { join } from 'path';
import { TreeItem, TreeItemCollapsibleState, TreeView, Uri } from 'vscode';

const LIGHT_SVG_URL = 'nx-cli-light.svg';
const DARK_SVG_URL = 'nx-cli-dark.svg';

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

  constructor(
    readonly commandString: string,
    readonly extensionPath: string,
    readonly generatorType?: GeneratorType,
    readonly generator?: string
  ) {
    super(commandString, TreeItemCollapsibleState.None);
    this.iconPath = RunTargetTreeItem.getIconUri(this.extensionPath);
    this.command = {
      title: commandString,
      command:
        commandString === 'generate'
          ? 'nxConsole.revealWebViewPanel'
          : 'nx.run',
      tooltip: '',
      arguments:
        commandString === 'generate'
          ? [this]
          : commandString === 'run'
          ? []
          : ['', this.commandString],
    };
  }
  iconPath;

  static getIconUri(
    extensionPath: string
  ): { light: Uri; dark: Uri } | undefined {
    return {
      light: Uri.file(join(extensionPath, 'assets', LIGHT_SVG_URL)),
      dark: Uri.file(join(extensionPath, 'assets', DARK_SVG_URL)),
    };
  }
}
