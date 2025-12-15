import { commands, ExtensionContext, OutputChannel, window } from 'vscode';
import { Logger } from '@nx-console/shared-utils';
import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';

let _channel: OutputChannel;

function getOutputChannel(): OutputChannel {
  if (!_channel) {
    _channel = window.createOutputChannel('Nx Console');
  }
  return _channel;
}

export function showOutputChannel() {
  getOutputChannel().show();
}

export function initOutputChannels(context: ExtensionContext) {
  context.subscriptions.push(
    getOutputChannel(),
    getNxlsOutputChannel(),
    commands.registerCommand('nxConsole.showNxlsLogs', () => {
      getNxlsOutputChannel().show();
    }),
  );
}

let _nxlsOutputChannel: OutputChannel;

export function getNxlsOutputChannel(): OutputChannel {
  if (!_nxlsOutputChannel) {
    _nxlsOutputChannel = window.createOutputChannel('Nx Language Server');
  }
  return _nxlsOutputChannel;
}

export const vscodeLogger: Logger = {
  log: (message: string, ...args: any[]) => {
    getOutputChannel().appendLine(
      `[${new Date().toISOString()}] ${message} ${args.join(' ')}`,
    );
  },
  debug: (message: string, ...args: any[]) => {
    const enableDebugLogging = GlobalConfigurationStore.instance.get(
      'enableDebugLogging',
      false,
    );
    if (enableDebugLogging) {
      getOutputChannel().appendLine(
        `[${new Date().toISOString()}] ${message} ${args.join(' ')}`,
      );
    }
  },
};
