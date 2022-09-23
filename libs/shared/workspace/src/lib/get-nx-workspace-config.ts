import type {
  NxJsonConfiguration,
  ProjectGraph,
  ProjectsConfigurations,
} from '@nrwl/devkit';
import { join } from 'path';
import {
  getNxProjectGraph,
  getNxWorkspacePackageFileUtils,
} from './get-nx-workspace-package';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { nxVersion } from '@nx-console/shared/npm';
import { Logger } from '@nx-console/shared/schema';

export type NxWorkspaceConfiguration = ProjectsConfigurations &
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
  workspacePath: string,
  format: 'nx' | 'angularCli',
  isNxWorkspace: boolean,
  logger: Logger
): Promise<{
  workspaceConfiguration: NxWorkspaceConfiguration;
  configPath: string;
}> {
  const version = await nxVersion(workspacePath);

  if (version < 12) {
    return readWorkspaceConfigs(format, workspacePath);
  }

  try {
    const [nxWorkspacePackage, nxProjectGraph] = await Promise.all([
      getNxWorkspacePackageFileUtils(workspacePath, logger),
      getNxProjectGraph(workspacePath, logger),
    ]);
    const configFile = nxWorkspacePackage.workspaceFileName();

    let workspaceConfiguration: NxWorkspaceConfiguration;
    try {
      workspaceConfiguration = nxWorkspacePackage.readWorkspaceConfig({
        format,
        path: workspacePath,
      });
    } catch {
      workspaceConfiguration = (
        await readWorkspaceConfigs(format, workspacePath)
      ).workspaceConfiguration;
    }

    let projectGraph: ProjectGraph | null = null;
    try {
      if (!isNxWorkspace) {
        throw 'No project graph support';
      }

      process.exit = function (code?: number) {
        console.warn('process.exit called with code', code);
      } as (code?: number) => never;

      if (version < 13) {
        projectGraph = (nxProjectGraph as any).createProjectGraph();
      } else {
        // TODO(cammisuli): Remove `any` when upgrading to Nx 14.7+
        projectGraph = await (nxProjectGraph as any).createProjectGraphAsync({
          exitOnError: false,
          resetDaemonClient: true,
        });
      }
    } catch {
      //noop
    }

    addProjectTargets(workspaceConfiguration, projectGraph);

    return {
      workspaceConfiguration,
      configPath: join(workspacePath, configFile),
    };
  } catch (e) {
    return readWorkspaceConfigs(format, workspacePath);
  }
}

async function readWorkspaceConfigs(
  format: 'nx' | 'angularCli',
  basedir: string
) {
  let workspaceJson: ProjectsConfigurations;
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

  for (const [projectName, node] of Object.entries(projectGraph.nodes)) {
    const workspaceProject = workspaceConfiguration.projects[projectName];

    if (!workspaceProject) {
      // Certain versions of Nx will include npm, (or other third party dependencies) in the project graph nodes.
      // These usually start with `npm:depname`
      // We dont want to include them.
      if (projectName.match(/:/)) {
        continue;
      }

      workspaceConfiguration.projects[projectName] = {
        root: node.data.root,
        targets: node.data.targets ?? {},
        name: projectName,
        tags: node.data.tags ?? [],
      };
    } else {
      workspaceConfiguration.projects[projectName] = {
        ...workspaceProject,
        targets: node.data.targets ?? {},
      };
    }
  }
}
