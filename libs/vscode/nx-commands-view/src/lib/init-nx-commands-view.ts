import { NxCommandsTreeProvider } from './nx-commands-provider';
import { ExtensionContext, window } from 'vscode';
export function initNxCommandsView(context: ExtensionContext) {
  const nxCommandsTreeView = window.createTreeView('nxCommands', {
    treeDataProvider: new NxCommandsTreeProvider(context),
  });

  context.subscriptions.push(nxCommandsTreeView);
}
