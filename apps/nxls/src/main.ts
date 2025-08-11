import {
  completionHandler,
  configureSchemaForProject,
  configureSchemas,
  projectSchemaIsRegistered,
  resetInferencePluginsCompletionCache,
} from '@nx-console/language-server-capabilities-code-completion';
import {
  downloadAndExtractArtifact,
  getNxCloudTerminalOutput,
  getRecentCIPEData,
  nxCloudAuthHeaders,
} from '@nx-console/shared-nx-cloud';
import { getDefinition } from '@nx-console/language-server-capabilities-definition';
import { getDocumentLinks } from '@nx-console/language-server-capabilities-document-links';
import { getHover } from '@nx-console/language-server-capabilities-hover';
import {
  NxChangeWorkspace,
  NxCloudAuthHeadersRequest,
  NxCloudOnboardingInfoRequest,
  NxCloudStatusRequest,
  NxCloudTerminalOutputRequest,
  NxCreateProjectGraphRequest,
  NxDownloadAndExtractArtifactRequest,
  NxGeneratorContextV2Request,
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
  NxHasAffectedProjectsRequest,
  NxPDVDataRequest,
  NxGraphDataRequest,
  NxParseTargetStringRequest,
  NxProjectByPathRequest,
  NxProjectByRootRequest,
  NxProjectFolderTreeRequest,
  NxProjectGraphOutputRequest,
  NxProjectsByPathsRequest,
  NxRecentCIPEDataRequest,
  NxSourceMapFilesToProjectsMapRequest,
  NxStartupMessageRequest,
  NxStopDaemonRequest,
  NxTargetsForConfigFileRequest,
  NxTransformedGeneratorSchemaRequest,
  NxVersionRequest,
  NxWorkspacePathRequest,
  NxWorkspaceRefreshNotification,
  NxWorkspaceRefreshStartedNotification,
  NxWorkspaceRequest,
  NxWorkspaceSerializedRequest,
} from '@nx-console/language-server-types';
import {
  getJsonLanguageService,
  getLanguageModelCache,
  lspLogger,
  setLspLogger,
} from '@nx-console/language-server-utils';
import { languageServerWatcher } from '@nx-console/language-server-watcher';
import {
  createProjectGraph,
  getCloudOnboardingInfo,
  getGeneratorContextV2,
  getGeneratorOptions,
  getNxCloudStatus,
  getPDVData,
  getGraphData,
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
  nxStopDaemon,
  parseTargetString,
  resetProjectPathCache,
  resetSourceMapFilesToProjectCache,
} from '@nx-console/language-server-workspace';
import { GeneratorSchema } from '@nx-console/shared-generate-ui-types';
import {
  getGenerators,
  getNxVersion,
  nxWorkspace,
  resetNxVersionCache,
} from '@nx-console/shared-nx-workspace-info';
import { NxWorkspace } from '@nx-console/shared-types';
import {
  formatError,
  killGroup,
  loadRootEnvFiles,
} from '@nx-console/shared-utils';
import { ClientCapabilities, TextDocument } from 'vscode-json-languageservice';
import {
  CreateFilesParams,
  DeleteFilesParams,
  FileOperationPatternKind,
  InitializeResult,
  ProposedFeatures,
  ResponseError,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { ensureOnlyJsonRpcStdout } from './ensureOnlyJsonRpcStdout';
import { NativeWatcher } from '@nx-console/shared-watcher';

process.on('unhandledRejection', (e: any) => {
  connection.console.error(formatError(`Unhandled exception`, e));
});

process.on('uncaughtException', (e) => {
  connection.console.error(formatError('Unhandled exception', e));
});

let WORKING_PATH: string | undefined = undefined;
let CLIENT_CAPABILITIES: ClientCapabilities | undefined = undefined;
let unregisterFileWatcher: () => Promise<void> = async () => {
  //noop
};
let reconfigureAttempts = 0;

const connection = createConnection(ProposedFeatures.all);

// Create a text document manager.
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(async (params) => {
  setLspLogger(connection);
  lspLogger.log('Initializing Nx Language Server');

  const { workspacePath } = params.initializationOptions ?? {};
  try {
    WORKING_PATH =
      workspacePath ||
      params.workspaceFolders?.[0]?.uri ||
      params.rootPath ||
      URI.parse(params.rootUri ?? '').fsPath;

    if (!WORKING_PATH) {
      throw 'Unable to determine workspace path';
    }

    loadRootEnvFiles(WORKING_PATH);

    CLIENT_CAPABILITIES = params.capabilities;

    await configureSchemas(WORKING_PATH, CLIENT_CAPABILITIES);
    unregisterFileWatcher = await languageServerWatcher(
      WORKING_PATH,
      async () => {
        if (!WORKING_PATH) {
          return;
        }
        await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
      },
    );
  } catch (e) {
    lspLogger.log('Unable to get Nx info: ' + e.toString());
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', ':'],
      },
      hoverProvider: true,
      definitionProvider: true,
      documentLinkProvider: {
        resolveProvider: false,
        workDoneProgress: false,
      },
      workspace: {
        fileOperations: {
          didCreate: {
            filters: [
              {
                pattern: {
                  glob: '**/project.json',
                  matches: FileOperationPatternKind.file,
                },
              },
            ],
          },
          didDelete: {
            filters: [
              {
                pattern: {
                  glob: '**/project.json',
                  matches: FileOperationPatternKind.file,
                },
              },
            ],
          },
        },
      },
    },
    pid: process.pid,
  };

  return result;
});

connection.onCompletion(async (completionParams) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  return await completionHandler(
    WORKING_PATH,
    documents,
    completionParams,
    jsonDocumentMapper,
    CLIENT_CAPABILITIES,
  );
});

connection.onHover(async (hoverParams) => {
  const hoverDocument = documents.get(hoverParams.textDocument.uri);

  if (!hoverDocument) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(hoverDocument);
  return await getHover(hoverParams, jsonAst, document);
});

connection.onDefinition(async (definitionParams) => {
  const definitionDocument = documents.get(definitionParams.textDocument.uri);

  if (!definitionDocument || !WORKING_PATH) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(definitionDocument);

  return await getDefinition(WORKING_PATH, definitionParams, jsonAst, document);
});

connection.onDocumentLinks(async (params) => {
  try {
    const linkDocument = documents.get(params.textDocument.uri);

    if (!linkDocument) {
      return null;
    }

    const { jsonAst, document } = getJsonDocument(linkDocument);

    const schemas = await getJsonLanguageService()?.getMatchingSchemas(
      document,
      jsonAst,
    );

    if (!schemas) {
      return;
    }
    const links = await getDocumentLinks(
      WORKING_PATH,
      jsonAst,
      document,
      schemas,
    );
    return links;
  } catch (e) {
    return;
  }
});

const jsonDocumentMapper = getLanguageModelCache();

documents.onDidClose((e) => {
  NativeWatcher.onCloseDocument(e.document.uri);
  jsonDocumentMapper.onDocumentRemoved(e.document);
});

documents.onDidOpen(async (e) => {
  NativeWatcher.onOpenDocument(e.document.uri);
  if (!e.document.uri.endsWith('project.json')) {
    return;
  }
  if (!WORKING_PATH) {
    return;
  }
  const project = await getProjectByPath(
    URI.parse(e.document.uri).fsPath,
    WORKING_PATH,
  );

  if (!project || !project.name) {
    return;
  }

  if (projectSchemaIsRegistered(project.name)) {
    return;
  }

  configureSchemaForProject(project.name, WORKING_PATH, CLIENT_CAPABILITIES);
});

connection.onShutdown(async () => {
  await unregisterFileWatcher();
  jsonDocumentMapper.dispose();
});

connection.onRequest(NxStopDaemonRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  return await nxStopDaemon(WORKING_PATH, lspLogger);
});

connection.onRequest(NxWorkspaceRequest, async ({ reset }) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  return await nxWorkspace(WORKING_PATH, lspLogger, reset);
});

connection.onRequest(NxWorkspaceSerializedRequest, async ({ reset }) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  const workspace = await nxWorkspace(WORKING_PATH, lspLogger, reset);
  return JSON.stringify(workspace);
});

connection.onRequest(NxWorkspacePathRequest, () => {
  return WORKING_PATH;
});

connection.onRequest(
  NxGeneratorsRequest,
  async (args: { options?: NxGeneratorsRequestOptions }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }

    return await getGenerators(WORKING_PATH, args.options);
  },
);

connection.onRequest(
  NxGeneratorOptionsRequest,
  async (args: { options: NxGeneratorOptionsRequestOptions }) => {
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
  NxProjectsByPathsRequest,
  async (args: { paths: string[] }) => {
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
  NxProjectByRootRequest,
  async (args: { projectRoot: string }) => {
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
  NxGeneratorContextV2Request,
  async (args: { path: string | undefined }) => {
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
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  const nxVersion = await getNxVersion(WORKING_PATH, reset);
  return nxVersion;
});

connection.onRequest(NxProjectGraphOutputRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await getProjectGraphOutput(WORKING_PATH);
});

connection.onRequest(NxCreateProjectGraphRequest, async ({ showAffected }) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  try {
    await createProjectGraph(WORKING_PATH, showAffected);
  } catch (e) {
    lspLogger.log('Error creating project graph: ' + e.toString());
    return e;
  }
});

connection.onRequest(NxProjectFolderTreeRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await getProjectFolderTree(WORKING_PATH);
});

connection.onRequest(
  NxTransformedGeneratorSchemaRequest,
  async (schema: GeneratorSchema) => {
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
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await hasAffectedProjects(WORKING_PATH, lspLogger);
});

connection.onRequest(NxSourceMapFilesToProjectsMapRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await getSourceMapFilesToProjectsMap(WORKING_PATH);
});

connection.onRequest(
  NxTargetsForConfigFileRequest,
  async (args: { projectName: string; configFilePath: string }) => {
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
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await getNxCloudStatus(WORKING_PATH);
});

connection.onRequest(
  NxCloudOnboardingInfoRequest,
  async (args: { force?: boolean }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return await getCloudOnboardingInfo(WORKING_PATH, args.force);
  },
);

connection.onRequest(NxPDVDataRequest, async (args: { filePath: string }) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await getPDVData(WORKING_PATH, args.filePath);
});

connection.onRequest(NxGraphDataRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await getGraphData(WORKING_PATH);
});

connection.onRequest(NxRecentCIPEDataRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  return await getRecentCIPEData(WORKING_PATH, lspLogger);
});

connection.onRequest(
  NxCloudTerminalOutputRequest,
  async (args: {
    ciPipelineExecutionId?: string;
    taskId: string;
    linkId?: string;
  }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path',
      );
    }
    return getNxCloudTerminalOutput(args, WORKING_PATH, lspLogger);
  },
);

connection.onRequest(
  NxParseTargetStringRequest,
  async (targetString: string) => {
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
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return await nxCloudAuthHeaders(WORKING_PATH);
});

connection.onRequest(
  NxDownloadAndExtractArtifactRequest,
  async ({ artifactUrl }) => {
    try {
      const content = await downloadAndExtractArtifact(artifactUrl, lspLogger);
      return { content };
    } catch (e) {
      lspLogger.log(`Error downloading artifact: ${e.message}`);
      return { error: e.message };
    }
  },
);

connection.onNotification(NxWorkspaceRefreshNotification, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1001, 'Unable to get Nx info: no workspace path');
  }

  await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
});

connection.onNotification(
  'workspace/didCreateFiles',
  async (createdFiles: CreateFilesParams) => {
    if (!createdFiles.files.some((f) => f.uri.endsWith('project.json'))) {
      return;
    }

    if (!WORKING_PATH) {
      return new ResponseError(
        1001,
        'Unable to get Nx info: no workspace path',
      );
    }

    await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
  },
);

connection.onNotification(
  'workspace/didDeleteFiles',
  async (deletedFiles: DeleteFilesParams) => {
    if (!deletedFiles.files.some((f) => f.uri.endsWith('project.json'))) {
      return;
    }

    if (!WORKING_PATH) {
      return new ResponseError(
        1001,
        'Unable to get Nx info: no workspace path',
      );
    }

    await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
  },
);

connection.onNotification(NxChangeWorkspace, async (workspacePath) => {
  WORKING_PATH = workspacePath;
  loadRootEnvFiles(WORKING_PATH);

  await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
});

async function reconfigureAndSendNotificationWithBackoff(workingPath: string) {
  if (reconfigureAttempts === 0) {
    connection.sendNotification(NxWorkspaceRefreshStartedNotification.method);
  }
  const workspace = await reconfigure(workingPath);
  await connection.sendNotification(NxWorkspaceRefreshNotification.method);

  if (
    !workspace?.errors ||
    (workspace.errors &&
      workspace.isPartial &&
      Object.keys(workspace.projectGraph.nodes ?? {}).length > 0)
  ) {
    reconfigureAttempts = 0;
    return;
  }

  if (reconfigureAttempts < 3) {
    reconfigureAttempts++;
    lspLogger.log(
      `reconfiguration failed, trying again in ${
        reconfigureAttempts * reconfigureAttempts
      } seconds`,
    );
    new Promise((resolve) =>
      setTimeout(resolve, 1000 * reconfigureAttempts * reconfigureAttempts),
    ).then(() => reconfigureAndSendNotificationWithBackoff(workingPath));
  } else {
    lspLogger.log(
      `reconfiguration failed after ${reconfigureAttempts} attempts`,
    );
    reconfigureAttempts = 0;
  }
}

async function reconfigure(
  workingPath: string,
): Promise<NxWorkspace | undefined> {
  resetNxVersionCache();
  resetProjectPathCache();
  resetSourceMapFilesToProjectCache();
  resetInferencePluginsCompletionCache();

  const workspace = await nxWorkspace(workingPath, lspLogger, true);
  await configureSchemas(workingPath, CLIENT_CAPABILITIES);

  await unregisterFileWatcher();

  unregisterFileWatcher = await languageServerWatcher(workingPath, async () => {
    reconfigureAndSendNotificationWithBackoff(workingPath);
  });

  return workspace;
}

function getJsonDocument(document: TextDocument) {
  return jsonDocumentMapper.retrieve(document);
}

ensureOnlyJsonRpcStdout();

let exiting = false;
/* eslint-disable no-empty */
const exitHandler = async () => {
  if (exiting) return;
  exiting = true;
  process.off('SIGTERM', exitHandler);

  try {
    await unregisterFileWatcher();
  } catch {}

  try {
    connection.dispose();
  } catch (e) {}

  try {
    if (process.connected) {
      process.disconnect();
    }
  } catch {}

  killGroup(process.pid);
};
process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);

connection.onExit(exitHandler);

connection.listen();
