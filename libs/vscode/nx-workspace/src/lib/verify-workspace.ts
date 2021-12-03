import { NxJsonConfiguration, WorkspaceJsonConfiguration } from '@nrwl/devkit';
import {
  fileExists,
  getOutputChannel,
  getTelemetry,
  toWorkspaceFormat,
} from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';
import { window } from 'vscode';
import { getNxWorkspaceConfig } from './get-nx-workspace-config';

interface Workspace {
  validWorkspaceJson: boolean;
  json: WorkspaceJsonConfiguration & NxJsonConfiguration;
  workspaceType: 'ng' | 'nx';
  configurationFilePath: string;
}

export async function verifyWorkspace(): Promise<Workspace> {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  const isAngularWorkspace = await fileExists(
    join(workspacePath, 'angularCli')
  );
  const config = await getNxWorkspaceConfig(
    workspacePath,
    isAngularWorkspace ? 'angularCli' : 'nx'
  );
  try {
    return {
      validWorkspaceJson: true,
      workspaceType: isAngularWorkspace ? 'ng' : 'nx',
      json: toWorkspaceFormat(config.workspaceConfiguration),
      configurationFilePath: config.configPath,
    };
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
        npmScope: '@nx-console',
        projects: {},
        version: 2,
      },
      configurationFilePath: '',
    };
  }
}
