import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { AbstractTreeProvider } from '@nx-console/vscode/utils';
import { commands, ExtensionContext } from 'vscode';
import { NxCommandConfig, NxCommandsTreeItem } from './nx-commands-tree-item';
import { logAndShowTaskCreationError } from '@nx-console/vscode/output-channels';

export const EXECUTE_ARBITRARY_COMMAND = 'nxConsole.executeArbitraryCommand';

export class NxCommandsTreeProvider extends AbstractTreeProvider<NxCommandsTreeItem> {
  constructor(private readonly context: ExtensionContext) {
    super();
    commands.registerCommand(
      EXECUTE_ARBITRARY_COMMAND,
      this.executeArbitraryCommand
    );
    GlobalConfigurationStore.instance.onConfigurationChange(() =>
      this.refresh()
    );

    onWorkspaceRefreshed(() => this.refresh());
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
            label: command,
          };
        }
        if (command === 'add-dependency') {
          return {
            type: 'add-dependency',
            command: 'nxConsole.addDependency',
            label: 'Add Dependency',
          };
        }
        if (command === 'add-dev-dependency') {
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

  async executeArbitraryCommand(command: string) {
    let _command: string;
    let positional: string | undefined;

    const commandBeforeFlags = command.split(' -')[0];
    if (commandBeforeFlags.includes(' ')) {
      _command = commandBeforeFlags.split(' ')[0];
      positional = commandBeforeFlags.replace(_command, '').trim();
    } else {
      _command = commandBeforeFlags;
      positional = undefined;
    }

    const flags = command
      .replace(commandBeforeFlags, '')
      .split(' ')
      .filter(Boolean);

    try {
      CliTaskProvider.instance.executeTask({
        command: _command,
        positional,
        flags,
      });
    } catch (e) {
      logAndShowTaskCreationError(e);
      return;
    }
  }
}
