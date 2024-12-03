import { lspLogger } from '@nx-console/language-server/utils';
import { readJsonFile, readNxJson } from '@nx-console/shared/npm';
import { gte, NxVersion } from '@nx-console/shared/nx-version';
import { Logger } from '@nx-console/shared/schema';
import { NxError } from '@nx-console/shared/types';
import type {
  NxJsonConfiguration,
  ProjectFileMap,
  ProjectGraph,
} from 'nx/src/devkit-exports';
import type { ProjectGraphError } from 'nx/src/project-graph/error-types';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';
import { performance } from 'perf_hooks';
import {
  getNxDaemonClient,
  getNxOutput,
  getNxProjectGraph,
  getNxProjectGraphUtils,
} from './get-nx-workspace-package';

let _defaultProcessExit: typeof process.exit;

export async function getNxWorkspaceConfig(
  workspacePath: string,
  nxVersion: NxVersion,
  logger: Logger
): Promise<{
  projectGraph: ProjectGraph;
  sourceMaps: ConfigurationSourceMaps | undefined;
  nxJson: NxJsonConfiguration;
  projectFileMap: ProjectFileMap | undefined;
  errors?: NxError[];
  isPartial?: boolean;
}> {
  let nxJson: NxJsonConfiguration = {};
  let projectGraph: ProjectGraph = {
    nodes: {},
    dependencies: {},
  };
  let sourceMaps: ConfigurationSourceMaps | undefined = undefined;
  let projectFileMap: ProjectFileMap = {};
  let isPartial = undefined;

  let errors: NxError[] | undefined;

  const start = performance.now();
  logger.log(`Retrieving workspace configuration for nx ${nxVersion.full}`);

  if (!gte(nxVersion, '12.0.0')) {
    lspLogger.log('Major version is less than 12');
    return {
      projectGraph,
      sourceMaps,
      nxJson,
      projectFileMap,
      errors,
      isPartial,
    };
  }

  try {
    // Always set the CI env variable to false
    (process.env as any).CI = false;
    (process.env as any).NX_PROJECT_GLOB_CACHE = false;
    (process.env as any).NX_WORKSPACE_ROOT_PATH = workspacePath;
    const [
      nxProjectGraph,
      nxOutput,
      nxProjectGraphUtils,
      nxDaemonClientModule,
    ] = await Promise.all([
      getNxProjectGraph(workspacePath, logger),
      getNxOutput(workspacePath, logger),
      getNxProjectGraphUtils(workspacePath, logger),
      getNxDaemonClient(workspacePath, logger),
    ]);

    // things tend to break if nx.json is broken so let's abort in this case
    try {
      nxJson = await readNxJson(workspacePath);
    } catch (e) {
      const canReadLerna = await canReadLernaJson(workspacePath);
      if (!canReadLerna) {
        const newError = new Error(`Unable to read nx.json: ${e.message}`);
        newError.stack = e.stack;
        throw newError;
      }
    }

    if (nxDaemonClientModule) {
      lspLogger.log(
        `daemon enabled: ${nxDaemonClientModule.daemonClient?.enabled()}`
      );
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

      if (gte(nxVersion, '17.2.0')) {
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
          if (isProjectGraphError(e)) {
            lspLogger.log('caught ProjectGraphError, using partial graph');
            projectGraph = e.getPartialProjectGraph() ?? {
              nodes: {},
              dependencies: {},
            };
            sourceMaps = e.getPartialSourcemaps();
            errors = e.getErrors().map((error) => ({
              name: error.name,
              message: error.message,
              stack: error.stack,
              file:
                (error as any).file ??
                ((error as any).cause as any)?.errors?.[0]?.location?.file,
              pluginName: (error as any).pluginName,
              cause: (error as any).cause,
            }));
            isPartial = true;
          } else {
            throw e;
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
      errors = [{ stack: e.stack }];
    }

    if (gte(nxVersion, '16.3.1') && projectGraph) {
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

    // reset the daemon client after getting all required information from the daemon
    if (nxDaemonClientModule && nxDaemonClientModule.daemonClient?.enabled()) {
      try {
        lspLogger.log('Resetting daemon client');
        nxDaemonClientModule.daemonClient?.reset();
      } catch (e) {
        lspLogger.log(`Error while resetting daemon client, moving on...`);
      }
    }

    const end = performance.now();
    logger.log(`Retrieved workspace configuration in: ${end - start} ms`);

    process.exit = _defaultProcessExit;

    projectGraph.nodes = Object.fromEntries(
      Object.entries(projectGraph.nodes).sort(([a], [b]) => a.localeCompare(b))
    );

    return {
      projectGraph,
      sourceMaps,
      nxJson,
      projectFileMap,
      errors,
      isPartial,
    };
  } catch (e) {
    lspLogger.log(`Unable to get nx workspace configuration: ${e}`);
    process.exit = _defaultProcessExit;
    return {
      projectGraph,
      sourceMaps,
      nxJson,
      projectFileMap,
      errors: [{ message: e.message, stack: e.stack }],
      isPartial,
    };
  }
}

function isProjectGraphError(e: any): e is ProjectGraphError {
  return e.name === 'ProjectGraphError';
}

async function canReadLernaJson(workspacePath: string): Promise<boolean> {
  try {
    await readJsonFile('lerna.json', workspacePath);
    return true;
  } catch (e) {
    return false;
  }
}
