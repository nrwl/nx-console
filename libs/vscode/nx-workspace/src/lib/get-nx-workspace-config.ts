import {
  NxJsonConfiguration,
  WorkspaceJsonConfiguration,
  ProjectGraph,
} from '@nrwl/devkit';
import { readAndCacheJsonFile } from '@nx-console/server';
import { join } from 'path';
import {
  getNxProjectGraph,
  getNxWorkspacePackageFileUtils,
} from './get-nx-workspace-package';
import { nxVersion } from './nx-version';

export type NxWorkspaceConfiguration = WorkspaceJsonConfiguration &
  NxJsonConfiguration;

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
  workspaceConfiguration: NxWorkspaceConfiguration;
  configPath: string;
}> {
  const version = nxVersion();

  if (version < 12) {
    return readWorkspaceConfigs(format, basedir);
  }

  try {
    const [nxWorkspacePackage, nxProjectGraph] = await Promise.all([
      getNxWorkspacePackageFileUtils(),
      getNxProjectGraph(),
    ]);
    const configFile = nxWorkspacePackage.workspaceFileName();

    let projectGraph: ProjectGraph | null = null;
    try {
      if (format === 'angularCli') {
        throw 'No project graph support';
      }

      if (version < 13) {
        projectGraph = (nxProjectGraph as any).readCurrentProjectGraph();
      } else {
        projectGraph = nxProjectGraph.readCachedProjectGraph();
      }

      if (!projectGraph) {
        if (version < 13) {
          projectGraph = (nxProjectGraph as any).createProjectGraph();
        } else {
          projectGraph = await nxProjectGraph.createProjectGraphAsync();
        }
      }
    } catch {
      //noop
    }

    let workspaceConfiguration: NxWorkspaceConfiguration;
    try {
      workspaceConfiguration = nxWorkspacePackage.readWorkspaceConfig({
        format,
        path: basedir,
      });
    } catch {
      workspaceConfiguration = (await readWorkspaceConfigs(format, basedir))
        .workspaceConfiguration;
    }

    addProjectTargets(workspaceConfiguration, projectGraph);

    return {
      workspaceConfiguration,
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

function addProjectTargets(
  workspaceConfiguration: NxWorkspaceConfiguration,
  projectGraph: ProjectGraph | null
) {
  if (!projectGraph) {
    return;
  }

  for (const [projectName, configuration] of Object.entries(
    workspaceConfiguration.projects
  )) {
    configuration.targets = projectGraph.nodes[projectName].data.targets;
  }
}
