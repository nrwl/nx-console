import {
  NxCloudAuthHeadersRequest,
  NxConfigureAiAgentsStatusRequest,
  NxCloudOnboardingInfoRequest,
  NxCloudStatusRequest,
  NxCreateProjectGraphRequest,
  NxDownloadAndExtractArtifactRequest,
  NxGeneratorContextV2Request,
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
  NxHasAffectedProjectsRequest,
  NxParseTargetStringRequest,
  NxPDVDataRequest,
  NxProjectByPathRequest,
  NxProjectByRootRequest,
  NxProjectFolderTreeRequest,
  NxProjectGraphOutputRequest,
  NxProjectsByPathsRequest,
  NxRecentCIPEDataRequest,
  NxSourceMapFilesToProjectsMapRequest,
  NxStartDaemonRequest,
  NxStartupMessageRequest,
  NxStopDaemonRequest,
  NxTargetsForConfigFileRequest,
  NxTransformedGeneratorSchemaRequest,
  NxVersionRequest,
  NxWorkspaceSerializedRequest,
} from '@nx-console/language-server-types';
import { lspLogger } from '@nx-console/language-server-utils';
import {
  createProjectGraph,
  getCloudOnboardingInfo,
  getConfigureAiAgentsStatus,
  getGeneratorContextV2,
  getGeneratorOptions,
  getNxCloudStatus,
  getPDVData,
  getProjectByPath,
  getProjectByRoot,
  getProjectFolderTree,
  getProjectGraphOutput,
  getProjectsByPaths,
  getSourceMapFilesToProjectsMap,
  getStartupMessage,
  getTargetsForConfigFile,
  getTransformedGeneratorSchema,
  hasAffectedProjects,
  nxStartDaemon,
  nxStopDaemon,
  parseTargetString,
} from '@nx-console/language-server-workspace';
import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import {
  downloadAndExtractArtifact,
  getRecentCIPEData,
  nxCloudAuthHeaders,
} from '@nx-console/shared-nx-cloud';
import {
  getGenerators,
  getNxVersion,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';
import { _, _Connection, ResponseError } from 'vscode-languageserver/node';

export function registerRequests(
  connection: _Connection<_, _, _, _, _, _, _, _>,
  getWorkingPath: () => string | undefined,
) {
  connection.onRequest(NxStopDaemonRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }

    return await nxStopDaemon(WORKING_PATH, lspLogger);
  });

  connection.onRequest(NxStartDaemonRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }

    return await nxStartDaemon(WORKING_PATH, lspLogger);
  });

  connection.onRequest(NxWorkspaceSerializedRequest, async ({ reset }) => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }

    const workspace = await nxWorkspace(WORKING_PATH, lspLogger, reset);
    return JSON.stringify(workspace);
  });

  connection.onRequest(
    NxGeneratorsRequest,
    async (args: { options?: NxGeneratorsRequestOptions }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }

      return await getGenerators(WORKING_PATH, args.options, lspLogger);
    },
  );

  connection.onRequest(
    NxGeneratorOptionsRequest,
    async (args: { options: NxGeneratorOptionsRequestOptions }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }

      return await getGeneratorOptions(
        WORKING_PATH,
        args.options.collection,
        args.options.name,
        args.options.path,
      );
    },
  );

  connection.onRequest(
    NxProjectByPathRequest,
    async (args: { projectPath: string }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getProjectByPath(args.projectPath, WORKING_PATH);
    },
  );

  connection.onRequest(
    NxProjectByRootRequest,
    async (args: { projectRoot: string }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getProjectByRoot(args.projectRoot, WORKING_PATH);
    },
  );

  connection.onRequest(
    NxProjectsByPathsRequest,
    async (args: { paths: string[] }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getProjectsByPaths(args.paths, WORKING_PATH);
    },
  );

  connection.onRequest(
    NxGeneratorContextV2Request,
    async (args: { path: string | undefined }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getGeneratorContextV2(args.path, WORKING_PATH);
    },
  );

  connection.onRequest(NxVersionRequest, async ({ reset }) => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    const nxVersion = await getNxVersion(WORKING_PATH, reset);
    return nxVersion;
  });

  connection.onRequest(NxProjectGraphOutputRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await getProjectGraphOutput(WORKING_PATH);
  });

  connection.onRequest(
    NxCreateProjectGraphRequest,
    async ({ showAffected }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      try {
        await createProjectGraph(WORKING_PATH, showAffected);
      } catch (e) {
        lspLogger.log('Error creating project graph: ' + e.toString());
        return e;
      }
    },
  );

  connection.onRequest(NxProjectFolderTreeRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await getProjectFolderTree(WORKING_PATH);
  });

  connection.onRequest(
    NxTransformedGeneratorSchemaRequest,
    async (schema: GeneratorSchema) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getTransformedGeneratorSchema(WORKING_PATH, schema);
    },
  );

  connection.onRequest(
    NxStartupMessageRequest,
    async (schema: GeneratorSchema) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getStartupMessage(WORKING_PATH, schema);
    },
  );

  connection.onRequest(NxHasAffectedProjectsRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await hasAffectedProjects(WORKING_PATH, lspLogger);
  });

  connection.onRequest(NxSourceMapFilesToProjectsMapRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await getSourceMapFilesToProjectsMap(WORKING_PATH);
  });

  connection.onRequest(
    NxTargetsForConfigFileRequest,
    async (args: { projectName: string; configFilePath: string }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getTargetsForConfigFile(
        args.projectName,
        args.configFilePath,
        WORKING_PATH,
      );
    },
  );

  connection.onRequest(NxCloudStatusRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await getNxCloudStatus(WORKING_PATH);
  });

  connection.onRequest(
    NxCloudOnboardingInfoRequest,
    async (args: { force?: boolean }) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await getCloudOnboardingInfo(WORKING_PATH, args.force);
    },
  );

  connection.onRequest(NxConfigureAiAgentsStatusRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return null;
    }
    return await getConfigureAiAgentsStatus(WORKING_PATH);
  });

  connection.onRequest(NxPDVDataRequest, async (args: { filePath: string }) => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await getPDVData(WORKING_PATH, args.filePath);
  });

  connection.onRequest(NxRecentCIPEDataRequest, async (params) => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }

    return await getRecentCIPEData(WORKING_PATH, lspLogger, params);
  });

  connection.onRequest(
    NxParseTargetStringRequest,
    async (targetString: string) => {
      const WORKING_PATH = getWorkingPath();
      if (!WORKING_PATH) {
        return new ResponseError(
          1000,
          'Unable to get Nx info: no workspace path',
        );
      }
      return await parseTargetString(targetString, WORKING_PATH);
    },
  );

  connection.onRequest(NxCloudAuthHeadersRequest, async () => {
    const WORKING_PATH = getWorkingPath();
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await nxCloudAuthHeaders(WORKING_PATH);
  });

  connection.onRequest(
    NxDownloadAndExtractArtifactRequest,
    async ({ artifactUrl }) => {
      try {
        const content = await downloadAndExtractArtifact(
          artifactUrl,
          lspLogger,
        );
        return { content };
      } catch (e) {
        lspLogger.log(`Error downloading artifact: ${e.message}`);
        return { error: e.message };
      }
    },
  );
}
