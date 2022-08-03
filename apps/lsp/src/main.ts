import { getExecutors } from '@nx-console/collections';
import {
  getProjectJsonSchema,
  getWorkspaceJsonSchema,
} from '@nx-console/json-schema';
import {
  ClientCapabilities,
  getLanguageService,
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
import { jsonDocumentsMapper } from './json-documents';
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

const jsonDocumentMapper = jsonDocumentsMapper((document) =>
  languageService.parseJSONDocument(document)
);

// Create a text document manager.
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

documents.onDidClose((e) => {
  jsonDocumentMapper.remove(e.document);
});

connection.onInitialize(async (params) => {
  debugger;
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
  const document = documents.get(completionParams.textDocument.uri);
  if (!document) {
    return null;
  }

  const jsonDocument = getJsonDocument(document);
  const completionList = await languageService.doComplete(
    document,
    completionParams.position,
    jsonDocument
  );
  console.log(completionList);
  return completionList;
});

function getJsonDocument(document: TextDocument) {
  return jsonDocumentMapper.get(document);
}

connection.listen();
