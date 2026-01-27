import {
  completionHandler,
  configureSchemaForProject,
  configureSchemas,
  projectSchemaIsRegistered,
  resetInferencePluginsCompletionCache,
} from '@nx-console/language-server-capabilities-code-completion';
import { getDefinition } from '@nx-console/language-server-capabilities-definition';
import { getDocumentLinks } from '@nx-console/language-server-capabilities-document-links';
import { getHover } from '@nx-console/language-server-capabilities-hover';
import {
  NxChangeWorkspace,
  NxWatcherOperationalNotification,
  NxWorkspacePathRequest,
  NxWorkspaceRefreshNotification,
  NxWorkspaceRefreshStartedNotification,
  NxWorkspaceRequest,
} from '@nx-console/language-server-types';
import {
  getJsonLanguageService,
  getLanguageModelCache,
  lspLogger,
  setLspLogger,
} from '@nx-console/language-server-utils';
import {
  cleanupAllWatchers,
  languageServerWatcher,
} from '@nx-console/language-server-watcher';
import {
  getProjectByPath,
  resetProjectPathCache,
  resetSourceMapFilesToProjectCache,
} from '@nx-console/language-server-workspace';
import {
  nxWorkspace,
  resetNxVersionCache,
} from '@nx-console/shared-nx-workspace-info';
import { NxWorkspace } from '@nx-console/shared-types';
import {
  configureCustomCACertificates,
  formatError,
  killGroup,
  loadRootEnvFiles,
} from '@nx-console/shared-utils';
import {
  DaemonWatcherCallback,
  NativeWatcher,
} from '@nx-console/shared-watcher';
import type { ProjectGraph } from 'nx/src/devkit-exports';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';
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
import { registerRequests } from './requests';

configureCustomCACertificates();

const connection = createConnection(ProposedFeatures.all);

let connectionAlive = true;

function safeSendNotification(
  ...args: Parameters<typeof connection.sendNotification>
) {
  if (!connectionAlive) return;
  connection.sendNotification(...args);
}

process.on('unhandledRejection', (e: any) => {
  if (!connectionAlive) return;
  connection.console.error(formatError(`Unhandled exception`, e));
});

process.on('uncaughtException', (e) => {
  if (!connectionAlive) return;
  connection.console.error(formatError('Unhandled exception', e));
});

let WORKING_PATH: string | undefined = undefined;
let CLIENT_CAPABILITIES: ClientCapabilities | undefined = undefined;
let DISABLE_FILE_WATCHING = false;
let unregisterFileWatcher: () => Promise<void> = async () => {
  //noop
};
const fileWatcherCallback: DaemonWatcherCallback = async (
  _,
  projectGraphAndSourceMaps,
) => {
  if (!WORKING_PATH) {
    return;
  }
  await reconfigureAndSendNotificationWithBackoff(
    WORKING_PATH,
    projectGraphAndSourceMaps,
  );
};
const fileWatcherOperationalCallback = (isOperational: boolean) => {
  safeSendNotification(NxWatcherOperationalNotification.method, {
    isOperational,
  });
};
let reconfigureAttempts = 0;

// Create a text document manager.
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(async (params) => {
  const { workspacePath, enableDebugLogging, disableFileWatching } =
    params.initializationOptions ?? {};
  setLspLogger(connection, enableDebugLogging ?? false);
  lspLogger.log(
    'Debug logging is ' + (enableDebugLogging ? 'enabled' : 'disabled'),
  );
  DISABLE_FILE_WATCHING = disableFileWatching ?? false;
  lspLogger.log(
    'File watching is ' + (DISABLE_FILE_WATCHING ? 'disabled' : 'enabled'),
  );
  lspLogger.log('Initializing Nx Language Server');

  const extractFsPathFromUri = (uri: string | undefined) =>
    uri && URI.parse(uri).fsPath;
  try {
    WORKING_PATH =
      workspacePath ||
      extractFsPathFromUri(params.workspaceFolders?.[0]?.uri) ||
      params.rootPath ||
      extractFsPathFromUri(params.rootUri ?? '');

    if (!WORKING_PATH) {
      throw 'Unable to determine workspace path';
    }

    loadRootEnvFiles(WORKING_PATH);

    CLIENT_CAPABILITIES = params.capabilities;

    await configureSchemas(WORKING_PATH, CLIENT_CAPABILITIES, {
      deferred: true,
    });

    setTimeout(() => {
      if (WORKING_PATH) {
        reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
      }
    }, 20);

    if (!DISABLE_FILE_WATCHING) {
      unregisterFileWatcher = await languageServerWatcher(
        WORKING_PATH,
        fileWatcherCallback,
        fileWatcherOperationalCallback,
      );
    }
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
  connectionAlive = false;
  lspLogger.log('Language server shutdown initiated');
  try {
    await unregisterFileWatcher();
  } catch (e) {
    lspLogger.log('Error during file watcher cleanup: ' + e);
  }

  try {
    await cleanupAllWatchers();
  } catch (e) {
    lspLogger.log('Error during global watcher cleanup: ' + e);
  }

  try {
    jsonDocumentMapper.dispose();
  } catch (e) {
    lspLogger.log('Error disposing json document mapper: ' + e);
  }
  lspLogger.log('Language server shutdown completed');
});

connection.onRequest(NxWorkspaceRequest, async ({ reset }) => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  return await nxWorkspace(WORKING_PATH, lspLogger, reset);
});

connection.onRequest(NxWorkspacePathRequest, () => {
  return WORKING_PATH;
});

connection.onNotification(NxWorkspaceRefreshNotification, async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1001, 'Unable to get Nx info: no workspace path');
  }

  await reconfigureAndSendNotificationWithBackoff(WORKING_PATH);
});

registerRequests(connection, () => WORKING_PATH);

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

async function reconfigureAndSendNotificationWithBackoff(
  workingPath: string,
  projectGraphAndSourceMaps?: {
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  } | null,
) {
  if (reconfigureAttempts === 0) {
    safeSendNotification(NxWorkspaceRefreshStartedNotification.method);
  }
  const workspace = await reconfigure(workingPath, projectGraphAndSourceMaps);
  await safeSendNotification(NxWorkspaceRefreshNotification.method);

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
  projectGraphAndSourceMaps?: {
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  } | null,
): Promise<NxWorkspace | undefined> {
  lspLogger.debug?.(
    `reconfigure: Starting, projectGraphAndSourceMaps=${!!projectGraphAndSourceMaps}`,
  );
  resetNxVersionCache();
  resetProjectPathCache();
  resetSourceMapFilesToProjectCache();
  resetInferencePluginsCompletionCache();
  lspLogger.debug?.('reconfigure: Caches reset, calling nxWorkspace...');

  const workspace = await nxWorkspace(
    workingPath,
    lspLogger,
    true,
    projectGraphAndSourceMaps,
  );
  lspLogger.debug?.(
    `reconfigure: nxWorkspace completed, errors=${workspace?.errors?.length ?? 0}`,
  );
  await configureSchemas(workingPath, CLIENT_CAPABILITIES);
  lspLogger.debug?.('reconfigure: Schemas configured');

  lspLogger.debug?.('reconfigure: Unregistering previous file watcher...');
  await unregisterFileWatcher?.();

  if (!DISABLE_FILE_WATCHING) {
    lspLogger.debug?.('reconfigure: Starting new file watcher...');
    unregisterFileWatcher = await languageServerWatcher(
      workingPath,
      fileWatcherCallback,
      fileWatcherOperationalCallback,
    );
    lspLogger.debug?.('reconfigure: File watcher started');
  }

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
  connectionAlive = false;
  process.off('SIGTERM', exitHandler);

  try {
    await unregisterFileWatcher();
  } catch (e) {}

  try {
    await cleanupAllWatchers();
  } catch (e) {}

  try {
    connection.dispose();
  } catch (e) {}

  try {
    if (process.connected) {
      process.disconnect();
    }
  } catch (e) {}

  killGroup(process.pid);
};
process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);

connection.onExit(exitHandler);

connection.listen();
