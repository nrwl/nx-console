import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, ExtensionContext } from 'vscode';
import { NxCommandConfig, NxCommandsTreeItem } from './nx-commands-tree-item';

export class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();

    GlobalConfigurationStore.instance.onConfigurationChange(() =>
      this.refresh()
    );

    onWorkspaceRefreshed(() => this.refresh());
  }

  getParent(_: NxCommandsTreeItem) {
    return null;
  }

  async getChildren(): Promise<NxCommandsTreeItem[]> {
    const nxCommands = await this.getNxCommands();
    const targets = await this.getTargets();
    const defaultCommands = await this.getDefaultCommands();

    return [
      { type: 'generate' } as const,
      ...nxCommands,
      ...targets,
      ...defaultCommands,
    ].map((c) => new NxCommandsTreeItem(c, this.context.extensionPath));
  }

  async getNxCommands(): Promise<NxCommandConfig[]> {
    const commonCommands = GlobalConfigurationStore.instance.get<string[]>(
      'commonNxCommands',
      []
    );
    const vscodeCommands = new Set(await commands.getCommands(true));
    const availableCommands: NxCommandConfig[] = commonCommands
      .filter(
        (command) =>
          command !== 'add-dependency' &&
          command !== 'add-dev-dependency' &&
          command !== 'generate'
      )
      .map((command) => {
        const transformedCommand = `nx.${command.replace(':', '.')}`;
        if (vscodeCommands.has(transformedCommand)) {
          return {
            command: transformedCommand,
            type: 'vscode-command',
            label: command,
          };
        }
        return {
          command,
          type: 'arbitrary-command',
          label: command,
        };
      });

    return availableCommands;
  }

  async getTargets(): Promise<NxCommandConfig[]> {
    const workspace = (await getNxWorkspace())?.workspace ?? { projects: {} };
    const targets = Object.values(workspace.projects).reduce((acc, project) => {
      for (const target of Object.keys(project.targets ?? {})) {
        acc.add(target);
      }
      return acc;
    }, new Set<string>());
    return Array.from(targets)
      .sort()
      .map((target) => ({
        target,
        type: 'target',
      }));
  }

  async getDefaultCommands(): Promise<NxCommandConfig[]> {
    return [
      {
        type: 'add-dependency',
      },
      {
        type: 'add-dev-dependency',
      },
      {
        type: 'select-workspace',
      },
    ];
  }
}
