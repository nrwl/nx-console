import {
  fileExistsSync,
  getOutputChannel,
  getTelemetry,
  cacheJson,
  readAndCacheJsonFile,
  toWorkspaceFormat,
} from '@nx-console/server';
import { window } from 'vscode';
import { dirname, join } from 'path';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';
import { WorkspaceJsonConfiguration } from '@nrwl/devkit';

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
      readNxWorkspaceConfig(workspacePath, workspaceJsonPath);
      return {
        validWorkspaceJson: true,
        json: toWorkspaceFormat(
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
        json: toWorkspaceFormat(readAndCacheJsonFile(angularJsonPath).json),
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

function readNxWorkspaceConfig(basedir: string, workspaceJsonPath: string) {
  // try and use the workspace version of nx
  try {
    const cachedWorkspaceJson = cacheJson(workspaceJsonPath).json;
    if (!cachedWorkspaceJson) {
      const workspace = getNxWorkspacePackageFileUtils().readWorkspaceConfig({
        format: 'nx',
        path: basedir,
      } as any);
      cacheJson(workspaceJsonPath, '', workspace);
    }
  } catch (e) {
    // noop - will use the old way
  }
}
