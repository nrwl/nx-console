import type {
  NxJsonConfiguration,
  ProjectGraph,
  ProjectsConfigurations,
} from 'nx/src/devkit-exports';
import { lspLogger } from '@nx-console/language-server/utils';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { Logger } from '@nx-console/shared/schema';
import { NxWorkspaceConfiguration } from '@nx-console/shared/types';
import { join } from 'path';
import { SemVer } from 'semver';
import {
  getNxProjectGraph,
  getNxWorkspacePackageFileUtils,
} from './get-nx-workspace-package';

let projectGraph: ProjectGraph | null = null;

export async function getNxWorkspaceConfig(
  workspacePath: string,
  nxVersion: SemVer,
  logger: Logger
): Promise<{
  workspaceConfiguration: NxWorkspaceConfiguration;
  daemonEnabled?: boolean;
}> {
  const start = performance.now();
  logger.log('Retrieving workspace configuration');

  if (nxVersion.major < 12) {
    lspLogger.log('Major version is less than 12');
    return readWorkspaceConfigs(workspacePath);
  }

  try {
    // Always set the CI env variable to false
    (process.env as any).CI = false;
    (process.env as any).NX_PROJECT_GLOB_CACHE = false;
    (process.env as any).NX_WORKSPACE_ROOT_PATH = workspacePath;
    const [nxWorkspacePackage, nxProjectGraph] = await Promise.all([
      getNxWorkspacePackageFileUtils(workspacePath, logger),
      getNxProjectGraph(workspacePath, logger),
    ]);

    let workspaceConfiguration: NxWorkspaceConfiguration;
    try {
      workspaceConfiguration = nxWorkspacePackage.readWorkspaceConfig({
        format: 'nx',
        path: workspacePath,
      });
    } catch {
      logger.log('Unable to read workspace config from nx workspace package');
      workspaceConfiguration = (await readWorkspaceConfigs(workspacePath))
        .workspaceConfiguration;
    }

    try {
      process.exit = function (code?: number) {
        console.warn('process.exit called with code', code);
      } as (code?: number) => never;

      if (nxVersion.major < 13) {
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
    return readWorkspaceConfigs(workspacePath);
  }
}

async function readWorkspaceConfigs(basedir: string) {
  const workspaceJson: ProjectsConfigurations = (
    await readAndCacheJsonFile('workspace.json', basedir)
  ).json;

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
    configPath: join(basedir, 'workspace.json'),
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
