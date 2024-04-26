import {
  configureSchemaForProject,
  configureSchemas,
  getCompletionItems,
  projectSchemaIsRegistered,
  resetInferencePluginsCompletionCache,
} from '@nx-console/language-server/capabilities/code-completion';
import { getDefinition } from '@nx-console/language-server/capabilities/definition';
import { getDocumentLinks } from '@nx-console/language-server/capabilities/document-links';
import { getHover } from '@nx-console/language-server/capabilities/hover';
import {
  NxChangeWorkspace,
  NxCreateProjectGraphRequest,
  NxGeneratorContextFromPathRequest,
  NxGeneratorContextV2Request,
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
  NxHasAffectedProjectsRequest,
  NxProjectByPathRequest,
  NxProjectByRootRequest,
  NxProjectFolderTreeRequest,
  NxProjectGraphOutputRequest,
  NxProjectsByPathsRequest,
  NxStopDaemonRequest,
  NxSourceMapFilesToProjectMapRequest,
  NxStartupMessageRequest,
  NxTargetsForConfigFileRequest,
  NxTransformedGeneratorSchemaRequest,
  NxVersionRequest,
  NxWorkspacePathRequest,
  NxWorkspaceRefreshNotification,
  NxWorkspaceRequest,
} from '@nx-console/language-server/types';
import {
  getJsonLanguageService,
  getLanguageModelCache,
  lspLogger,
  mergeArrays,
  nxStopDaemon,
  setLspLogger,
} from '@nx-console/language-server/utils';
import {
  languageServerWatcher,
  NativeWatcher,
} from '@nx-console/language-server/watcher';
import {
  createProjectGraph,
  getGeneratorContextFromPath,
  getGeneratorContextV2,
  getGeneratorOptions,
  getGenerators,
  getNxDaemonClient,
  getNxVersion,
  getProjectByPath,
  getProjectByRoot,
  getProjectFolderTree,
  getProjectGraphOutput,
  getProjectsByPaths,
  getSourceMapFilesToProjectMap,
  getStartupMessage,
  getTargetsForConfigFile,
  getTransformedGeneratorSchema,
  hasAffectedProjects,
  nxWorkspace,
  resetNxVersionCache,
  resetProjectPathCache,
  resetSourceMapFilesToProjectCache,
} from '@nx-console/language-server/workspace';
import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { TaskExecutionSchema } from '@nx-console/shared/schema';
import { NxWorkspace } from '@nx-console/shared/types';
import { formatError } from '@nx-console/shared/utils';
import { dirname, relative, join } from 'node:path';
import {
  ClientCapabilities,
  CompletionList,
  TextDocument,
} from 'vscode-json-languageservice';
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
import { URI, Utils } from 'vscode-uri';
import treeKill from 'tree-kill';
import { ensureOnlyJsonRpcStdout } from './ensureOnlyJsonRpcStdout';

process.on('unhandledRejection', (e: any) => {
  connection.console.error(formatError(`Unhandled exception`, e));
});

process.on('uncaughtException', (e) => {
  connection.console.error(formatError('Unhandled exception', e));
});

let WORKING_PATH: string | undefined = undefined;
let PID: number | null = null;
let CLIENT_CAPABILITIES: ClientCapabilities | undefined = undefined;
let unregisterFileWatcher: () => void = () => {
  //noop
};

let reconfigureAttempts = 0;

const workspaceContext = {
  resolveRelativePath: (relativePath: string, resource: string) => {
    const base = resource.substring(0, resource.lastIndexOf('/') + 1);
    return Utils.resolvePath(URI.parse(base), relativePath).toString();
  },
};

const connection = createConnection(ProposedFeatures.all);

// Create a text document manager.
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(async (params) => {
  setLspLogger(connection);
  lspLogger.log('Initializing Nx Language Server');

  PID = params.processId;

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

    CLIENT_CAPABILITIES = params.capabilities;

    await configureSchemas(WORKING_PATH, workspaceContext, CLIENT_CAPABILITIES);

    unregisterFileWatcher = await languageServerWatcher(
      WORKING_PATH,
      async () => {
        if (!WORKING_PATH) {
          return;
        }
        await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
      }
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
  };

  return result;
});

connection.onCompletion(async (completionParams) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  const changedDocument = documents.get(completionParams.textDocument.uri);
  if (!changedDocument) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(changedDocument);

  // get the project name from either the json AST (fast) or via the file path (slow)
  // if the project is not yet registered with the json language service, register it
  const uri = URI.parse(changedDocument.uri).fsPath;
  if (uri.endsWith('project.json')) {
    let relativeRootPath = relative(WORKING_PATH, dirname(uri));
    // the root project will have a path of '' while nx thinks of the path as '.'
    if (relativeRootPath === '') {
      relativeRootPath = '.';
    }

    if (relativeRootPath && !projectSchemaIsRegistered(relativeRootPath)) {
      await configureSchemaForProject(
        relativeRootPath,
        WORKING_PATH,
        workspaceContext,
        CLIENT_CAPABILITIES
      );
    }
  }
  const completionResults =
    (await getJsonLanguageService()?.doComplete(
      document,
      completionParams.position,
      jsonAst
    )) ?? CompletionList.create([]);

  const schemas = await getJsonLanguageService()?.getMatchingSchemas(
    document,
    jsonAst
  );

  if (!schemas) {
    return completionResults;
  }

  const { nxVersion } = await nxWorkspace(WORKING_PATH, lspLogger);

  const pathItems = await getCompletionItems(
    WORKING_PATH,
    nxVersion,
    jsonAst,
    document,
    schemas,
    completionParams.position,
    lspLogger
  );
  mergeArrays(completionResults.items, pathItems);

  return completionResults;
});

connection.onHover(async (hoverParams) => {
  const hoverDocument = documents.get(hoverParams.textDocument.uri);

  if (!hoverDocument) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(hoverDocument);
  return await getHover(hoverParams, jsonAst, document);
});

connection.onDefinition((definitionParams) => {
  const definitionDocument = documents.get(definitionParams.textDocument.uri);

  if (!definitionDocument || !WORKING_PATH) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(definitionDocument);

  return getDefinition(WORKING_PATH, definitionParams, jsonAst, document);
});

connection.onDocumentLinks(async (params) => {
  const linkDocument = documents.get(params.textDocument.uri);

  if (!linkDocument) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(linkDocument);

  const schemas = await getJsonLanguageService()?.getMatchingSchemas(
    document,
    jsonAst
  );

  if (!schemas) {
    return;
  }

  return getDocumentLinks(WORKING_PATH, jsonAst, document, schemas);
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
  const project = await getProjectByPath(
    URI.parse(e.document.uri).fsPath,
    WORKING_PATH!
  );

  if (!project || !project.name) {
    return;
  }

  if (projectSchemaIsRegistered(project.name)) {
    return;
  }

  configureSchemaForProject(
    project.name,
    WORKING_PATH,
    workspaceContext,
    CLIENT_CAPABILITIES
  );
});

connection.onShutdown(async () => {
  unregisterFileWatcher();
  jsonDocumentMapper.dispose();

  if (WORKING_PATH) {
    const nxDaemonClientModule = await getNxDaemonClient(
      WORKING_PATH,
      lspLogger
    );
    await nxDaemonClientModule?.daemonClient?.stop();
  }
});

connection.onExit(() => {
  connection.dispose();
  treeKill(process.pid, 'SIGTERM');
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

  return nxWorkspace(WORKING_PATH, lspLogger, reset);
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
        'Unable to get Nx info: no workspace path'
      );
    }

    return getGenerators(WORKING_PATH, args.options);
  }
);

connection.onRequest(
  NxGeneratorOptionsRequest,
  async (args: { options: NxGeneratorOptionsRequestOptions }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }

    return getGeneratorOptions(
      WORKING_PATH,
      args.options.collection,
      args.options.name,
      args.options.path
    );
  }
);

connection.onRequest(
  NxProjectByPathRequest,
  async (args: { projectPath: string }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getProjectByPath(args.projectPath, WORKING_PATH);
  }
);

connection.onRequest(
  NxProjectsByPathsRequest,
  async (args: { paths: string[] }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getProjectsByPaths(args.paths, WORKING_PATH);
  }
);

connection.onRequest(
  NxProjectByRootRequest,
  async (args: { projectRoot: string }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getProjectByRoot(args.projectRoot, WORKING_PATH);
  }
);

// TODO: REMOVE ONCE OLD GENERATE UI IS GONE
connection.onRequest(
  NxGeneratorContextFromPathRequest,
  async (args: { generator?: TaskExecutionSchema; path: string }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getGeneratorContextFromPath(args.generator, args.path, WORKING_PATH);
  }
);

connection.onRequest(
  NxGeneratorContextV2Request,
  async (args: { path: string | undefined }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getGeneratorContextV2(args.path, WORKING_PATH);
  }
);

connection.onRequest(NxVersionRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  const nxVersion = await getNxVersion(WORKING_PATH);
  lspLogger.log(`got nxVersion ${JSON.stringify(nxVersion)}`);
  return nxVersion;
});

connection.onRequest(NxProjectGraphOutputRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return getProjectGraphOutput(WORKING_PATH);
});

connection.onRequest(NxCreateProjectGraphRequest, async ({ showAffected }) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  try {
    await createProjectGraph(WORKING_PATH, showAffected, lspLogger);
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
        'Unable to get Nx info: no workspace path'
      );
    }
    return getTransformedGeneratorSchema(WORKING_PATH, schema);
  }
);

connection.onRequest(
  NxStartupMessageRequest,
  async (schema: GeneratorSchema) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getStartupMessage(WORKING_PATH, schema);
  }
);

connection.onRequest(NxHasAffectedProjectsRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return hasAffectedProjects(WORKING_PATH, lspLogger);
});

connection.onRequest(NxSourceMapFilesToProjectMapRequest, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }
  return getSourceMapFilesToProjectMap(WORKING_PATH);
});

connection.onRequest(
  NxTargetsForConfigFileRequest,
  async (args: { projectName: string; configFilePath: string }) => {
    if (!WORKING_PATH) {
      return new ResponseError(
        1000,
        'Unable to get Nx info: no workspace path'
      );
    }
    return getTargetsForConfigFile(
      args.projectName,
      args.configFilePath,
      WORKING_PATH
    );
  }
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
        'Unable to get Nx info: no workspace path'
      );
    }

    await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
  }
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
        'Unable to get Nx info: no workspace path'
      );
    }

    await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
  }
);

connection.onNotification(NxChangeWorkspace, async (workspacePath) => {
  WORKING_PATH = workspacePath;
  await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
});

async function reconfigureAndSendNotificationWithBackoff(workingPath: string) {
  const workspace = await reconfigure(workingPath);
  await connection.sendNotification(NxWorkspaceRefreshNotification.method);

  if (
    !workspace?.errors ||
    (workspace.errors &&
      workspace.isPartial &&
      Object.keys(workspace.workspace.projects ?? {}).length > 0)
  ) {
    reconfigureAttempts = 0;
    return;
  }

  if (reconfigureAttempts < 3) {
    reconfigureAttempts++;
    lspLogger.log(
      `reconfiguration failed, trying again in ${
        reconfigureAttempts * reconfigureAttempts
      } seconds`
    );
    new Promise((resolve) =>
      setTimeout(resolve, 1000 * reconfigureAttempts * reconfigureAttempts)
    ).then(() => reconfigureAndSendNotificationWithBackoff(workingPath));
  } else {
    lspLogger.log(
      `reconfiguration failed after ${reconfigureAttempts} attempts`
    );
    reconfigureAttempts = 0;
  }
}

async function reconfigure(
  workingPath: string
): Promise<NxWorkspace | undefined> {
  resetNxVersionCache();
  resetProjectPathCache();
  resetSourceMapFilesToProjectCache();
  resetInferencePluginsCompletionCache();

  const workspace = await nxWorkspace(workingPath, lspLogger, true);
  await configureSchemas(workingPath, workspaceContext, CLIENT_CAPABILITIES);

  unregisterFileWatcher();

  unregisterFileWatcher = await languageServerWatcher(workingPath, async () => {
    reconfigureAndSendNotificationWithBackoff(workingPath);
  });

  return workspace;
}

function getJsonDocument(document: TextDocument) {
  return jsonDocumentMapper.retrieve(document);
}

ensureOnlyJsonRpcStdout();
connection.listen();
