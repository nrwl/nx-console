import { lspLogger } from '@nx-console/language-server/utils';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { Logger } from '@nx-console/shared/schema';
import { NxVersion, NxWorkspaceConfiguration } from '@nx-console/shared/types';
import type {
  NxJsonConfiguration,
  ProjectFileMap,
  ProjectGraph,
  ProjectsConfigurations,
} from 'nx/src/devkit-exports';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { gte } from 'semver';
import {
  getNxDaemonClient,
  getNxOutput,
  getNxProjectGraph,
  getNxProjectGraphUtils,
  getNxWorkspacePackageFileUtils,
} from './get-nx-workspace-package';
import { ProjectGraphError } from 'nx/src/project-graph/project-graph';

let _defaultProcessExit: typeof process.exit;

export async function getNxWorkspaceConfig(
  workspacePath: string,
  nxVersion: NxVersion,
  logger: Logger
): Promise<{
  workspaceConfiguration: NxWorkspaceConfiguration;
  daemonEnabled?: boolean;
  errors?: (string | any)[];
  isPartial?: boolean;
}> {
  let projectGraph: ProjectGraph | null = null;
  let sourceMaps: Record<string, Record<string, string[]>> | undefined =
    undefined;
  let isPartial = undefined;

  let errors: (string | any)[] | undefined;

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

    let workspaceConfiguration: NxWorkspaceConfiguration | undefined =
      undefined;
    if (!gte(nxVersion.full, '17.3.0')) {
      try {
        workspaceConfiguration = nxWorkspacePackage.readWorkspaceConfig({
          format: 'nx',
          path: workspacePath,
        });
      } catch (e) {
        logger.log('Unable to read workspace config from nx workspace package');
        workspaceConfiguration = (await readWorkspaceConfigs(workspacePath))
          .workspaceConfiguration;
        errors = [`${e.stack}`];
      }
    } else {
      workspaceConfiguration = (await readWorkspaceConfigs(workspacePath))
        .workspaceConfiguration;
    }
    try {
      _defaultProcessExit = process.exit;
      process.exit = function (code?: number) {
        console.warn('process.exit called with code', code);
      } as (code?: number) => never;

      if (nxOutput !== undefined) {
        nxOutput.output.error = (output) => {
          // do nothing
        };
        nxOutput.output.log = (output) => {
          // do nothing
        };
      }

      if (nxVersion.major < 13) {
        projectGraph = (nxProjectGraph as any).createProjectGraph();
      } else if (gte(nxVersion.full, '17.2.0')) {
        lspLogger.log('createProjectGraphAndSourceMapsAsync');
        try {
          const projectGraphAndSourceMaps = await (
            nxProjectGraph as any
          ).createProjectGraphAndSourceMapsAsync({
            exitOnError: false,
          });
          projectGraph = projectGraphAndSourceMaps.projectGraph;
          sourceMaps = projectGraphAndSourceMaps.sourceMaps;
        } catch (e) {
          if (
            e instanceof ProjectGraphError ||
            e.name === 'ProjectGraphError'
          ) {
            lspLogger.log('caught ProjectGraphError, using partial graph');
            projectGraph = e.getPartialProjectGraph();
            sourceMaps = e.getPartialSourcemaps();
            isPartial = true;
          }
        }
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
      errors = [`${e.stack}`];
    }

    let projectFileMap: ProjectFileMap = {};
    if (gte(nxVersion.full, '16.3.1') && projectGraph) {
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

    if (!workspaceConfiguration) {
      workspaceConfiguration = {
        version: 1,
        projects: {},
      };
    }

    workspaceConfiguration = createNxWorkspaceConfiguration(
      workspaceConfiguration,
      projectGraph,
      projectFileMap,
      sourceMaps
    );

    // reset the daemon client after getting all required information from the daemon
    if (nxDaemonClientModule) {
      lspLogger.log('Resetting daemon client');
      nxDaemonClientModule.daemonClient?.reset();
    }

    const end = performance.now();
    logger.log(`Retrieved workspace configuration in: ${end - start} ms`);

    process.exit = _defaultProcessExit;
    return {
      workspaceConfiguration,
      errors,
      isPartial,
    };
  } catch (e) {
    lspLogger.log(`Unable to get nx workspace configuration: ${e}`);
    const config = await readWorkspaceConfigs(workspacePath);
    process.exit = _defaultProcessExit;
    return { ...config, errors: [`${e}`], isPartial };
  }
}

async function readWorkspaceConfigs(basedir: string): Promise<{
  workspaceConfiguration: NxWorkspaceConfiguration;
  configPath: string;
}> {
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
  sourceMaps: Record<string, Record<string, string[]>> | undefined
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
    const workspaceProject = workspaceConfiguration?.projects[projectName];

    if (!workspaceProject) {
      // Certain versions of Nx will include npm, (or other third party dependencies) in the project graph nodes.
      // These usually start with `npm:depname`
      // We dont want to include them.
      if (projectName.match(/:/)) {
        continue;
      }

      modifiedWorkspaceConfiguration.projects[projectName] = {
        ...node.data,
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
