import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { NxCommandConfig, NxCommandsTreeItem } from './nx-commands-tree-item';
import { ExtensionContext, commands } from 'vscode';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';

export class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
  }

  getParent(_: NxCommandsTreeItem) {
    return null;
  }

  async getChildren() {
    const commonCommands = GlobalConfigurationStore.instance.get<string[]>(
      'commonNxCommands',
      []
    );
    const vscodeCommands = new Set(await commands.getCommands(true));
    const availableCommands: NxCommandConfig[] = commonCommands.map(
      (command) => {
        const transformedCommand = `nx.${command.replace(':', '.')}`;
        if (vscodeCommands.has(transformedCommand)) {
          return {
            command: transformedCommand,
            type: 'vscode-command',
            label: transformedCommand,
          };
        }
        if (command === 'Add Dependency') {
          return {
            type: 'add-dependency',
            command: 'nxConsole.addDependency',
            label: 'Add Dependency',
          };
        }
        if (command === 'Add Dev Dependency') {
          return {
            type: 'add-dev-dependency',
            command: 'nxConsole.addDevDependency',
            label: 'Add Dev Dependency',
          };
        }
        return {
          command,
          type: 'arbitrary-command',
          label: command,
        };
      }
    );

    return availableCommands.map(
      (c) => new NxCommandsTreeItem(c, this.context.extensionPath)
    );
  }
}
