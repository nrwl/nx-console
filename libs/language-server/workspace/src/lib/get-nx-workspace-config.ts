import type {
  NxJsonConfiguration,
  ProjectFileMap,
  ProjectGraph,
  ProjectsConfigurations,
} from 'nx/src/devkit-exports';
import { lspLogger } from '@nx-console/language-server/utils';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { Logger } from '@nx-console/shared/schema';
import { NxWorkspaceConfiguration } from '@nx-console/shared/types';
import { join } from 'path';
import { SemVer, coerce, gte } from 'semver';
import {
  getNxDaemonClient,
  getNxOutput,
  getNxProjectGraph,
  getNxProjectGraphUtils,
  getNxWorkspacePackageFileUtils,
} from './get-nx-workspace-package';
import { performance } from 'perf_hooks';

let projectGraph: ProjectGraph | null = null;
let sourceMaps: Record<string, Record<string, string[]>> | undefined =
  undefined;

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
    const [
      nxWorkspacePackage,
      nxProjectGraph,
      nxOutput,
      nxProjectGraphUtils,
      nxDaemonClientModule,
    ] = await Promise.all([
      getNxWorkspacePackageFileUtils(workspacePath, logger),
      getNxProjectGraph(workspacePath, logger),
      getNxOutput(workspacePath, logger),
      getNxProjectGraphUtils(workspacePath, logger),
      getNxDaemonClient(workspacePath, logger),
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

      if (nxOutput !== undefined) {
        nxOutput.output.error = (output) => {
          // do nothing
        };
      }

      if (nxVersion.major < 13) {
        projectGraph = (nxProjectGraph as any).createProjectGraph();
      } else if (gte(nxVersion, coerce('17.2.0') ?? new SemVer('0.0.0'))) {
        lspLogger.log('createProjectGraphAndSourceMapsAsync');
        const projectGraphAndSourceMaps = await (
          nxProjectGraph as any
        ).createProjectGraphAndSourceMapsAsync({
          exitOnError: false,
        });
        projectGraph = projectGraphAndSourceMaps.projectGraph;
        sourceMaps = projectGraphAndSourceMaps.sourceMaps;
        lspLogger.log('createProjectGraphAndSourceMapsAsync successful');
      } else {
        lspLogger.log('createProjectGraphAsync');
        projectGraph = await nxProjectGraph.createProjectGraphAsync({
          exitOnError: false,
        });
        lspLogger.log('createProjectGraphAsync successful');
      }
    } catch (e) {
      lspLogger.log('Unable to get project graph');
      lspLogger.log(e.stack);
    }

    let projectFileMap: ProjectFileMap = {};
    if (gte(nxVersion, new SemVer('16.3.1')) && projectGraph) {
      projectFileMap =
        (await nxProjectGraphUtils?.createProjectFileMapUsingProjectGraph(
          projectGraph
        )) ?? {};
    } else {
      Object.keys(projectGraph?.nodes ?? {}).forEach((projectName) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projectFileMap[projectName] =
          (projectGraph?.nodes[projectName].data as any).files ?? [];
      });
    }

    workspaceConfiguration = createNxWorkspaceConfiguration(
      workspaceConfiguration,
      projectGraph,
      projectFileMap,
      sourceMaps
    );

    // reset the daemon client after getting all required information from the daemon
    if (nxDaemonClientModule) {
      nxDaemonClientModule.daemonClient.reset();
    }

    // for (const project in workspaceConfiguration.projects) {
    //   for (const target in workspaceConfiguration.projects[project].targets) {
    //     if (target === 'nx-release-publish') {
    //       delete workspaceConfiguration.projects[project].targets?.[target];
    //     }
    //   }
    // }
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

function createNxWorkspaceConfiguration(
  workspaceConfiguration: NxWorkspaceConfiguration,
  projectGraph: ProjectGraph | null,
  projectFileMap: ProjectFileMap,
  sourceMaps?: Record<string, Record<string, string[]>>
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
        files: projectFileMap[projectName],
      };
    } else {
      modifiedWorkspaceConfiguration.projects[projectName] = {
        ...workspaceProject,
        targets: node.data.targets ?? {},
        files: projectFileMap[projectName],
        name: projectName,
      };
    }
  }

  return { ...modifiedWorkspaceConfiguration, sourceMaps };
}
