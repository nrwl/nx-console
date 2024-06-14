import { logAndShowTaskCreationError } from '@nx-console/vscode/output-channels';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { commands, ExtensionContext, window } from 'vscode';
import { NxCommandsTreeProvider } from './nx-commands-provider';
export const EXECUTE_ARBITRARY_COMMAND = 'nxConsole.executeArbitraryCommand';

export function initNxCommandsView(context: ExtensionContext) {
  const nxCommandsTreeView = window.createTreeView('nxCommands', {
    treeDataProvider: new NxCommandsTreeProvider(context),
  });

  context.subscriptions.push(
    commands.registerCommand('nxConsole.editCommonCommands', () => {
      commands.executeCommand(
        'workbench.action.openSettings',
        'nxConsole.commonNxCommands'
      );
    }),
    commands.registerCommand(
      EXECUTE_ARBITRARY_COMMAND,
      executeArbitraryCommand
    ),
    nxCommandsTreeView
  );
}

async function executeArbitraryCommand(command: string) {
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
