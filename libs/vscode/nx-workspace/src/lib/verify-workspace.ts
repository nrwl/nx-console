import {
  fileExistsSync,
  getOutputChannel,
  getTelemetry,
  toWorkspaceFormat,
} from '@nx-console/server';
import { window } from 'vscode';
import { dirname, join } from 'path';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import { getNxWorkspaceConfig } from './get-nx-workspace-config';

export function verifyWorkspace(): {
  validWorkspaceJson: boolean;
  json: WorkspaceJsonConfiguration;
  workspaceType: 'ng' | 'nx';
  configurationFilePath: string;
} {
  const workspacePath = dirname(
    WorkspaceConfigurationStore.instance.get('nxWorkspaceJsonPath', '')
  );

  const workspaceJsonPath = join(workspacePath, 'workspace.json');
  const angularJsonPath = join(workspacePath, 'angular.json');

  try {
    if (fileExistsSync(workspaceJsonPath)) {
      return {
        validWorkspaceJson: true,
        // TODO(cammisuli): change all instances to use the new version - basically reverse this to the new format
        json: toWorkspaceFormat(
          getNxWorkspaceConfig(workspacePath, angularJsonPath)
        ),
        workspaceType: 'nx',
        configurationFilePath: workspaceJsonPath,
      };
    } else if (fileExistsSync(angularJsonPath)) {
      return {
        validWorkspaceJson: true,
        json: toWorkspaceFormat(
          getNxWorkspaceConfig(workspacePath, angularJsonPath)
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
      json: {
        projects: {},
        version: 2,
      },
      configurationFilePath: '',
    };
  }
}
