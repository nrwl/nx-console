#!/usr/bin/env node
import { getExecutors } from '@nx-console/collections';
import {
  getProjectJsonSchema,
  getWorkspaceJsonSchema,
} from '@nx-console/json-schema';
import {
  ClientCapabilities,
  getLanguageService,
  JSONDocument,
  TextDocument,
} from 'vscode-json-languageservice';
import {
  createConnection,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { URI, Utils } from 'vscode-uri';
import { getLanguageModelCache } from './languageModelCache';
import { getSchemaRequestService } from './runtime';

const workspaceContext = {
  resolveRelativePath: (relativePath: string, resource: string) => {
    const base = resource.substring(0, resource.lastIndexOf('/') + 1);
    return Utils.resolvePath(URI.parse(base), relativePath).toString();
  },
};

const connection = createConnection(ProposedFeatures.all);

let languageService = getLanguageService({
  workspaceContext,
  contributions: [],
  clientCapabilities: ClientCapabilities.LATEST,
});

// Create a text document manager.
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(async (params) => {
  // TODO: add capability checks
  const capabilities = params.capabilities;

  const { workspacePath, projects } = params.initializationOptions ?? {};

  languageService = getLanguageService({
    schemaRequestService: getSchemaRequestService(['file']),
    workspaceContext,
    contributions: [],
    clientCapabilities: params.capabilities,
  });

  // get schemas
  const collections = await getExecutors(workspacePath, projects, false);
  const workspaceSchema = getWorkspaceJsonSchema(collections);
  const projectSchema = getProjectJsonSchema(collections);
  console.log(projectSchema);
  languageService.configure({
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
  });

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', ':'],
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
  const completionList = await languageService.doComplete(
    document,
    completionParams.position,
    jsonAst
  );
  console.log(completionList);
  return completionList;
});

const jsonDocumentMapper = getLanguageModelCache(10, 60, (document) =>
  languageService.parseJSONDocument(document)
);

documents.onDidClose((e) => {
  jsonDocumentMapper.onDocumentRemoved(e.document);
});

connection.onShutdown(() => {
  jsonDocumentMapper.dispose();
});

function getJsonDocument(document: TextDocument) {
  return jsonDocumentMapper.get(document);
}

connection.listen();
