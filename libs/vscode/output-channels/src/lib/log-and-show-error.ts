import { getNxlsOutputChannel, getOutputChannel } from './output-channels';
import { window } from 'vscode';

export function logAndShowError(message: string, error?: string) {
  if (error) {
    getOutputChannel().appendLine(error);
  }

  window.showErrorMessage(message, 'Open Logs', 'OK').then((selection) => {
    if (selection === 'Open Logs') {
      getOutputChannel().show();
    }
  });
}

export function showNoNxVersionMessage() {
  window
    .showErrorMessage(
      'Error loading workspace information. Please check the logs.',
      'Open Logs',
      'OK'
    )
    .then((selection) => {
      if (selection === 'Open Logs') {
        getNxlsOutputChannel().show();
      }
    });
}
