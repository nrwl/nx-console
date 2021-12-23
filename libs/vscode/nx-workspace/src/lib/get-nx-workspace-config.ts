import type {
  NxJsonConfiguration,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import { readAndCacheJsonFile } from '@nx-console/server';
import { join } from 'path';
import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';
import { nxVersion } from './nx-version';
/**
 * There's a couple things that we need to handle here.
 *
 * 1. We need to check if the installed version of Nx is lower than 12. If that's the case then we need to just read the configurations like we used to do before. We need to do this because when we fallback to the Nx utils that are bundled with the extension, they throw errors when a workspace is lower than 13 :(
 * 2. If there is no version returned, then Nx isn't installed and we need to just use the nx utils to handle pure angular.json
 * 3. Otherwise get the nx utils and get the configuration
 * 4. Catch any errors and return the old way of reading the configuration
 *
 */
export async function getNxWorkspaceConfig(
  basedir: string,
  format: 'nx' | 'angularCli'
): Promise<{
  workspaceConfiguration: WorkspaceJsonConfiguration & NxJsonConfiguration;
  configPath: string;
}> {
  const version = nxVersion();

  if (version && version < 12) {
    return readWorkspaceConfigs(format, basedir);
  }

  try {
    const nxWorkspacePackage = await getNxWorkspacePackageFileUtils();
    const configFile = nxWorkspacePackage.workspaceFileName();
    return {
      workspaceConfiguration: nxWorkspacePackage.readWorkspaceConfig({
        format,
        path: basedir,
      }),
      configPath: join(basedir, configFile),
    };
  } catch (e) {
    return readWorkspaceConfigs(format, basedir);
  }
}

async function readWorkspaceConfigs(
  format: 'nx' | 'angularCli',
  basedir: string
) {
  let workspaceJson: WorkspaceJsonConfiguration;
  if (format === 'nx') {
    workspaceJson = (await readAndCacheJsonFile('workspace.json', basedir))
      .json;
  } else {
    workspaceJson = (await readAndCacheJsonFile('angular.json', basedir)).json;
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
