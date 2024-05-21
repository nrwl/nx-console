import { commands, ExtensionContext } from 'vscode';
import { getNxlsOutputChannel, getOutputChannel } from './output-channels';

export function initOutputChannels(context: ExtensionContext) {
  context.subscriptions.push(
    getOutputChannel(),
    getNxlsOutputChannel(),
    commands.registerCommand('nxConsole.showNxlsLogs', () => {
      getNxlsOutputChannel().show();
    })
  );
}
