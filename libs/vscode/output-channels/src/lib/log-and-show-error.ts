import {
  getNxlsOutputChannel,
  getOutputChannel,
  vscodeLogger,
} from './output-channels';
import { window } from 'vscode';

export function logAndShowError(message: string, error?: string) {
  if (error) {
    vscodeLogger.log(error);
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
      'OK',
    )
    .then((selection) => {
      if (selection === 'Open Logs') {
        getNxlsOutputChannel().show();
      }
    });
}

export function logAndShowTaskCreationError(error: any, message?: string) {
  getOutputChannel().appendLine(
    `Error running task: ${JSON.stringify(error.message ?? error)}`,
  );
  window
    .showErrorMessage(
      message ??
        'An error occured while running the task. Please see the logs for more information.',
      'Open Logs',
      'OK',
    )
    .then((selection) => {
      if (selection === 'Open Logs') {
        getOutputChannel().show();
      }
    });
}

export function showErrorMessageWithOpenLogs(message: string) {
  window.showErrorMessage(message, 'Open Logs', 'OK').then((selection) => {
    if (selection === 'Open Logs') {
      getNxlsOutputChannel().show();
    }
  });
}
