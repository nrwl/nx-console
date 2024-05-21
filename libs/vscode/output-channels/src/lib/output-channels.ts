import { OutputChannel, window } from 'vscode';
import { Logger } from '@nx-console/shared/schema';

let _channel: OutputChannel;

export function getOutputChannel(): OutputChannel {
  if (!_channel) {
    _channel = window.createOutputChannel('Nx Console');
  }
  return _channel;
}

export const outputLogger: Logger = {
  log(message) {
    getOutputChannel().appendLine(message);
  },
};

let _nxlsOutputChannel: OutputChannel;

export function getNxlsOutputChannel(): OutputChannel {
  if (!_nxlsOutputChannel) {
    _nxlsOutputChannel = window.createOutputChannel('Nx Language Server');
  }
  return _nxlsOutputChannel;
}
