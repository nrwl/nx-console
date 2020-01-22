import { readAndParseJson } from '@nx-console/server';
import { window } from 'vscode';

import { getOutputChannel } from '../output-channel';
import { getTelemetry } from '../telemetry';

export function verifyWorkspaceJson(
  jsonPath: string
): {
  validWorkspaceJson: boolean;
  json?: any;
  workspaceType: 'ng' | 'nx';
} {
  const workspaceType = jsonPath.endsWith('workspace.json') ? 'nx' : 'ng';
  try {
    const json = readAndParseJson(jsonPath);

    return { validWorkspaceJson: true, json, workspaceType };
  } catch (e) {
    const humanReadableError = 'Invalid workspace json: ' + jsonPath;
    window.showErrorMessage(humanReadableError, 'Show Error').then(value => {
      if (value) {
        getOutputChannel().show();
      }
    });
    getOutputChannel().appendLine(humanReadableError);

    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exception(stringifiedError);

    return { validWorkspaceJson: false, workspaceType };
  }
}
