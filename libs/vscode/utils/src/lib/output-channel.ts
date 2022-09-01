import { OutputChannel, window } from 'vscode';
import { Logger } from '@nx-console/schema';

let _channel: OutputChannel;

export function getOutputChannel(): OutputChannel {
  if (!_channel) {
    _channel = window.createOutputChannel('Nx Console');
  }
  return _channel;
}

export function outputLogger(): Logger {
  return {
    appendLine(message) {
      getOutputChannel().appendLine(message);
    },
  };
}
