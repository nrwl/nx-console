import { getOutputChannel } from './output-channel';
import { window } from 'vscode';

export function logAndShowTaskCreationError(error: any, message?: string) {
  getOutputChannel().appendLine(
    `Error running task: ${JSON.stringify(error.message ?? error)}`
  );
  window
    .showErrorMessage(
      message ??
        'An error occured while running the task. Please see the logs for more information.',
      'Open Logs',
      'OK'
    )
    .then((selection) => {
      if (selection === 'Open Logs') {
        getOutputChannel().show();
      }
    });
}
