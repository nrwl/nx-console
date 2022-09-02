import './global-polyfills';

import { getExecutors } from '@nx-console/collections';
import {
  getProjectJsonSchema,
  getWorkspaceJsonSchema,
} from '@nx-console/json-schema';
import { getCompletionItems } from '@nx-console/language-server/capabilities/code-completion';
import { getDocumentLinks } from '@nx-console/language-server/capabilities/document-links';
import {
  configureJsonLanguageService,
  getJsonLanguageService,
  getLanguageModelCache,
  getSchemaRequestService,
  lspLogger,
  mergeArrays,
  setLspLogger,
} from '@nx-console/language-server/utils';
import {
  ClientCapabilities,
  CompletionList,
  getLanguageService,
  LanguageService,
  TextDocument,
} from 'vscode-json-languageservice';
import {
  createConnection,
  InitializeResult,
  ProposedFeatures,
  ResponseError,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { URI, Utils } from 'vscode-uri';
import { nxWorkspace } from '@nx-console/workspace';

let WORKING_PATH: string | undefined = undefined;

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

  const { workspacePath, projects } = params.initializationOptions ?? {};
  try {
    WORKING_PATH =
      workspacePath ??
      params.rootPath ??
      URI.parse(params.rootUri ?? '').fsPath;

    if (!WORKING_PATH) {
      throw 'Unable to determine workspace path';
    }

    const collections = await getExecutors(WORKING_PATH, projects, false);
    const workspaceSchema = getWorkspaceJsonSchema(collections);
    const projectSchema = getProjectJsonSchema(collections);

    configureJsonLanguageService(
      {
        schemaRequestService: getSchemaRequestService(['file']),
        workspaceContext,
        contributions: [],
        clientCapabilities: params.capabilities,
      },
      {
        schemas: [
          {
            uri: 'nx://schemas/workspace',
            fileMatch: ['**/workspace.json', '**/angular.json'],
            schema: workspaceSchema,
          },
          {
            uri: 'nx://schemas/project',
            fileMatch: ['**/project.json'],
            schema: projectSchema,
          },
        ],
      }
    );
  } catch (e) {
    lspLogger.appendLine('Unable to get Nx info: ' + e.toString());
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', ':'],
      },
      hoverProvider: true,
      documentLinkProvider: {
        resolveProvider: false,
        workDoneProgress: false,
      },
    },
  };

  return result;
});

connection.onCompletion(async (completionParams) => {
  const changedDocument = documents.get(completionParams.textDocument.uri);
  if (!changedDocument) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(changedDocument);

  const completionResults =
    (await getJsonLanguageService().doComplete(
      document,
      completionParams.position,
      jsonAst
    )) ?? CompletionList.create([]);

  const schemas =
    (await getJsonLanguageService().getMatchingSchemas(document, jsonAst)) ??
    [];

  const pathItems = await getCompletionItems(
    WORKING_PATH,
    jsonAst,
    document,
    schemas,
    completionParams.position
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
  return getJsonLanguageService().doHover(
    document,
    hoverParams.position,
    jsonAst
  );
});

connection.onDocumentLinks(async (params) => {
  const linkDocument = documents.get(params.textDocument.uri);

  if (!linkDocument) {
    return null;
  }

  const { jsonAst, document } = getJsonDocument(linkDocument);
  const schemas =
    (await getJsonLanguageService().getMatchingSchemas(document, jsonAst)) ??
    [];

  return getDocumentLinks(WORKING_PATH, jsonAst, document, schemas);
});

const jsonDocumentMapper = getLanguageModelCache();

documents.onDidClose((e) => {
  jsonDocumentMapper.onDocumentRemoved(e.document);
});

connection.onShutdown(() => {
  jsonDocumentMapper.dispose();
});

connection.onRequest('nx/workspace', async () => {
  if (!WORKING_PATH) {
    return new ResponseError(1000, 'Unable to get Nx info: no workspace path');
  }

  const workspace = await nxWorkspace(WORKING_PATH, lspLogger);

  return workspace.workspace.projects;
});

function getJsonDocument(document: TextDocument) {
  return jsonDocumentMapper.get(document);
}

connection.listen();
