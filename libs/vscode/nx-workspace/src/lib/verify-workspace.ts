import { NxJsonConfiguration, WorkspaceJsonConfiguration } from '@nrwl/devkit';
import {
  fileExists,
  getOutputChannel,
  getTelemetry,
  readAndCacheJsonFile,
  toWorkspaceFormat,
} from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { join } from 'path';
import { window } from 'vscode';
import {
  getNxWorkspaceConfig,
  NxWorkspaceConfiguration,
} from './get-nx-workspace-config';

interface Workspace {
  validWorkspaceJson: boolean;
  json: WorkspaceJsonConfiguration & NxJsonConfiguration;
  workspaceType: 'ng' | 'nx';
  configurationFilePath: string;
  workspacePath: string;
}

export async function verifyWorkspace(): Promise<Workspace> {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );

  const isAngularWorkspace = await fileExists(
    join(workspacePath, 'angular.json')
  );
  const config = await getNxWorkspaceConfig(
    workspacePath,
    isAngularWorkspace ? 'angularCli' : 'nx'
  );

  await addPackageJsonTargets(workspacePath, config.workspaceConfiguration);

  try {
    return {
      validWorkspaceJson: true,
      workspaceType: isAngularWorkspace ? 'ng' : 'nx',
      json: toWorkspaceFormat(config.workspaceConfiguration),
      configurationFilePath: config.configPath,
      workspacePath,
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
      workspacePath,
    };
  }
}

/**
 * Checks to see if projects do not have a target. If they do not, then we look into the package.json and get the script options.
 * @param workspaceConfig
 */
async function addPackageJsonTargets(
  workspaceRoot: string,
  workspaceConfig: NxWorkspaceConfiguration
) {
  for (const projectConfiguration of Object.values(workspaceConfig.projects)) {
    if (!projectConfiguration.targets) {
      const { json } = await readAndCacheJsonFile(
        join(projectConfiguration.root, 'package.json'),
        workspaceRoot
      );

      if (json.scripts) {
        for (const script of Object.keys(json.scripts)) {
          projectConfiguration.targets ??= {};
          projectConfiguration.targets[script] = {
            executor: '@nrwl/nx',
          };
        }
      }
    } else {
      continue;
    }
  }
}
