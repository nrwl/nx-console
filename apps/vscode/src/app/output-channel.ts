import { OutputChannel, window } from 'vscode';

let _channel: OutputChannel;

export function getOutputChannel(): OutputChannel {
  if (!_channel) {
    _channel = window.createOutputChannel('Angular Console');
  }
  return _channel;
}
