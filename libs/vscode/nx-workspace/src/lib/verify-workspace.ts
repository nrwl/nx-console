import {
  readAndCacheJsonFile,
  fileExistsSync,
  toLegacyWorkspaceFormat,
  getOutputChannel,
  getTelemetry,
  cacheJson,
} from '@nx-console/server';
import { window } from 'vscode';
import { dirname, join } from 'path';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getNxWorkspacePackage } from './get-nx-workspace-package';

export function verifyWorkspace(): {
  validWorkspaceJson: boolean;
  json?: any;
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
      readNxWorkspaceConfig(workspacePath, workspaceJsonPath);
      return {
        validWorkspaceJson: true,
        // TODO(cammisuli): change all instances to use the new version - basically reverse this to the new format
        json: toLegacyWorkspaceFormat(
          /**
           * We would get the value from the `readWorkspaceConfig` call if that was successful.
           * Otherwise, we manually read the workspace.json file
           */
          readAndCacheJsonFile(workspaceJsonPath).json
        ),
        workspaceType: 'nx',
        configurationFilePath: workspaceJsonPath,
      };
    } else if (fileExistsSync(angularJsonPath)) {
      readNxWorkspaceConfig(workspacePath, angularJsonPath);
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

function readNxWorkspaceConfig(basedir: string, workspaceJsonPath: string) {
  // try and use the workspace version of nx
  try {
    const cachedWorkspaceJson = cacheJson(workspaceJsonPath).json;
    if (!cachedWorkspaceJson) {
      const workspace = getNxWorkspacePackage().readWorkspaceConfig({
        format: 'nx',
        path: basedir,
      } as any);
      cacheJson(workspaceJsonPath, '', workspace);
    }
  } catch (e) {
    // noop - will use the old way
  }
}
