import type {
  NxJsonConfiguration,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import { readAndCacheJsonFile } from '@nx-console/server';
import { join } from 'path';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';
import { nxVersion } from './nx-version';

export async function getNxWorkspaceConfig(
  basedir: string,
  format: 'nx' | 'angularCli'
): Promise<{
  workspaceConfiguration: WorkspaceJsonConfiguration & NxJsonConfiguration;
  configPath: string;
}> {
  const versionNumber = nxVersion();
  if (versionNumber && versionNumber < 13) {
    // Versions lower than 13 throw an error when trying to read configurations of workspaces that have nx.json properties in workspace.json
    let workspaceJson: WorkspaceJsonConfiguration;
    if (format === 'nx') {
      workspaceJson = (await readAndCacheJsonFile('workspace.json', basedir))
        .json;
    } else {
      workspaceJson = (await readAndCacheJsonFile('angular.json', basedir))
        .json;
    }

    const nxJson: NxJsonConfiguration = (
      await readAndCacheJsonFile('nx.json', basedir)
    ).json;
    return {
      workspaceConfiguration: {
        ...workspaceJson,
        ...nxJson,
        projects: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...((nxJson as any).projects ?? {}),
          ...workspaceJson.projects,
        },
      },
      configPath:
        format === 'nx'
          ? join(basedir, 'workspace.json')
          : join(basedir, 'angular.json'),
    };
  }

  const nxWorkspacePackage = await getNxWorkspacePackageFileUtils();

  const configFile = nxWorkspacePackage.workspaceFileName();

  return {
    workspaceConfiguration: nxWorkspacePackage.readWorkspaceConfig({
      format,
      path: basedir,
    }),
    configPath: join(basedir, configFile),
  };
}
