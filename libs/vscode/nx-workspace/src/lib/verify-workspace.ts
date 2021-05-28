import {
  readAndCacheJsonFile,
  fileExistsSync,
  toLegacyWorkspaceFormat,
  getOutputChannel,
  getTelemetry,
} from '@nx-console/server';
import { window } from 'vscode';
import { dirname, join } from 'path';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';

export function verifyWorkspace(): {
  validWorkspaceJson: boolean;
  json?: any;
  workspaceType: 'ng' | 'nx';
  configurationFilePath: string;
} {
  const workspacePath = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );
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
        configurationFilePath: workspaceJsonPath,
      };
    } else if (fileExistsSync(angularJsonPath)) {
      return {
        validWorkspaceJson: true,
        json: toLegacyWorkspaceFormat(
          readAndCacheJsonFile(angularJsonPath).json
        ),
        workspaceType: 'ng',
        configurationFilePath: angularJsonPath,
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
      configurationFilePath: '',
    };
  }
}
