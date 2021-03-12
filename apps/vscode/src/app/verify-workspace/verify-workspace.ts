import {
  readAndCacheJsonFile,
  fileExistsSync,
  toLegacyWorkspaceFormat,
} from '@nx-console/server';
import { window } from 'vscode';
import { join } from 'path';

import { getOutputChannel } from '../output-channel';
import { getTelemetry } from '../telemetry';

export function verifyWorkspace(
  workspacePath: string
): {
  validWorkspaceJson: boolean;
  json?: any;
  workspaceType: 'ng' | 'nx';
  configuratoinFilePath: string;
} {
  try {
    const workspaceJsonPath = join(workspacePath, 'workspace.json');
    const angularJsonPath = join(workspacePath, 'angular.json');
    if (fileExistsSync(workspaceJsonPath)) {
      return {
        validWorkspaceJson: true,
        json: toLegacyWorkspaceFormat(
          readAndCacheJsonFile(workspaceJsonPath).json
        ),
        workspaceType: 'nx',
        configuratoinFilePath: workspaceJsonPath,
      };
    } else if (fileExistsSync(angularJsonPath)) {
      return {
        validWorkspaceJson: true,
        json: toLegacyWorkspaceFormat(
          readAndCacheJsonFile(angularJsonPath).json
        ),
        workspaceType: 'ng',
        configuratoinFilePath: angularJsonPath,
      };
    } else {
      // Handles below along with other runtime errors.
      throw new Error(
        `Could not find configuration file in selected directory: ${workspacePath}`
      );
    }
  } catch (e) {
    const humanReadableError = 'Invalid workspace: ' + workspacePath;
    window.showErrorMessage(humanReadableError, 'Show Error').then((value) => {
      if (value) {
        getOutputChannel().show();
      }
    });
    getOutputChannel().appendLine(humanReadableError);

    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exception(stringifiedError);

    // Default to nx workspace
    return {
      validWorkspaceJson: false,
      workspaceType: 'nx',
      configuratoinFilePath: '',
    };
  }
}
