import { NxCommandsTreeProvider } from './nx-commands-provider';
import { commands, ExtensionContext, window } from 'vscode';
export function initNxCommandsView(context: ExtensionContext) {
  const nxCommandsTreeView = window.createTreeView('nxCommands', {
    treeDataProvider: new NxCommandsTreeProvider(context),
  });

  commands.registerCommand('nxConsole.editCommonCommands', () => {
    commands.executeCommand(
      'workbench.action.openSettings',
      'nxConsole.commonNxCommands'
    );
  });

  context.subscriptions.push(nxCommandsTreeView);
}
