import { existsSync } from 'fs';
import { window } from 'vscode';
import { join } from 'path';
import { readAndParseJson } from '@angular-console/server';
import { getOutputChannel } from './output-channel';
import { getTelemetry } from './telemetry';

export function verifyNodeModules(
  workspacePath: string
): { validNodeModules: boolean } {
  if (!existsSync(join(workspacePath, 'node_modules'))) {
    window.showErrorMessage(
      'Could not execute task since node_modules directory is missing. Run npm install at: ' +
        workspacePath
    );
    return { validNodeModules: false };
  }

  return { validNodeModules: true };
}

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
    getTelemetry().exceptionOccured(stringifiedError);

    return { validAngularJson: false };
  }
}
