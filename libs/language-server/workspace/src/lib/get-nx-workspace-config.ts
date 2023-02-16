import type {
  NxJsonConfiguration,
  ProjectGraph,
  ProjectsConfigurations,
} from '@nrwl/devkit';
import { lspLogger } from '@nx-console/language-server/utils';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { Logger } from '@nx-console/shared/schema';
import { NxWorkspaceConfiguration } from '@nx-console/shared/types';
import { join } from 'path';
import { getNxVersion } from './get-nx-version';
import {
  getNxProjectGraph,
  getNxWorkspacePackageFileUtils,
} from './get-nx-workspace-package';

let projectGraph: ProjectGraph | null = null;

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
  daemonEnabled?: boolean;
}> {
  const start = performance.now();
  logger.log('Retrieving workspace configuration');
  const version = await getNxVersion(workspacePath);

  if (version.major < 12) {
    lspLogger.log('Major version is less than 12');
    return readWorkspaceConfigs(format, workspacePath);
  }

  try {
    // Always set the CI env variable to false
    (process.env as any).CI = false;
    const [nxWorkspacePackage, nxProjectGraph] = await Promise.all([
      getNxWorkspacePackageFileUtils(workspacePath, logger),
      getNxProjectGraph(workspacePath, logger),
    ]);

    let workspaceConfiguration: NxWorkspaceConfiguration;
    try {
      workspaceConfiguration = nxWorkspacePackage.readWorkspaceConfig({
        format,
        path: workspacePath,
      });
    } catch {
      logger.log('Unable to read workspace config from nx workspace package');
      workspaceConfiguration = (
        await readWorkspaceConfigs(format, workspacePath)
      ).workspaceConfiguration;
    }

    try {
      if (!isNxWorkspace) {
        throw 'No project graph support';
      }

      process.exit = function (code?: number) {
        console.warn('process.exit called with code', code);
      } as (code?: number) => never;

      if (version.major < 13) {
        projectGraph = (nxProjectGraph as any).createProjectGraph();
      } else {
        lspLogger.log('createProjectGraphAsync');
        projectGraph = await nxProjectGraph.createProjectGraphAsync({
          exitOnError: false,
          resetDaemonClient: true,
        });
        lspLogger.log('createProjectGraphAsync successful');
      }
    } catch (e) {
      lspLogger.log('Unable to get project graph');
      lspLogger.log(e.stack);
    }

    workspaceConfiguration = addProjectTargets(
      workspaceConfiguration,
      projectGraph
    );

    const end = performance.now();
    logger.log(`Retrieved workspace configuration in: ${end - start} ms`);

    return {
      workspaceConfiguration,
    };
  } catch (e) {
    lspLogger.log(`Unable to get nx workspace configuration: ${e}`);
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
    return workspaceConfiguration;
  }

  // We always want to get the latest projects from the graph, rather than the ones in the workspace configuration
  const modifiedWorkspaceConfiguration: NxWorkspaceConfiguration = {
    ...workspaceConfiguration,
    projects: {},
  };

  for (const [projectName, node] of Object.entries(projectGraph.nodes)) {
    const workspaceProject = workspaceConfiguration.projects[projectName];

    if (!workspaceProject) {
      // Certain versions of Nx will include npm, (or other third party dependencies) in the project graph nodes.
      // These usually start with `npm:depname`
      // We dont want to include them.
      if (projectName.match(/:/)) {
        continue;
      }

      modifiedWorkspaceConfiguration.projects[projectName] = {
        root: node.data.root,
        targets: node.data.targets ?? {},
        name: projectName,
        tags: node.data.tags ?? [],
        files: node.data.files ?? [],
      };
    } else {
      modifiedWorkspaceConfiguration.projects[projectName] = {
        ...workspaceProject,
        targets: node.data.targets ?? {},
        files: node.data.files ?? [],
        name: projectName,
      };
    }
  }

  return modifiedWorkspaceConfiguration;
}
