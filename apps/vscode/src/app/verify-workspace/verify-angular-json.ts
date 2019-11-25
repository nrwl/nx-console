import { readAndParseJson } from '@angular-console/server';
import { join } from 'path';
import { window } from 'vscode';

import { getOutputChannel } from '../output-channel';
import { getTelemetry } from '../telemetry';

export function verifyAngularJson(
  workspacePath: string
): { validAngularJson: boolean; json?: any } {
  const jsonPath = join(workspacePath, 'angular.json');
  try {
    const json = readAndParseJson(jsonPath);

    return { validAngularJson: true, json };
  } catch (e) {
    const humanReadableError = 'Invalid angular.json: ' + jsonPath;
    window.showErrorMessage(humanReadableError, 'Show Error').then(value => {
      if (value) {
        getOutputChannel().show();
      }
    });
    getOutputChannel().appendLine(humanReadableError);

    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exception(stringifiedError);

    return { validAngularJson: false };
  }
}
