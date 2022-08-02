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
import { Utils, URI } from 'vscode-uri';
import { jsonDocumentsMapper } from './json-documents';

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

connection.onInitialize((params) => {
  // TODO: add capability checks
  const capabilities = params.capabilities;

  // const initializationOptions = params.initializationOptions ?? {};
  // const handledProtocols = initializationOptions?.handledSchemaProtocols;

  languageService = getLanguageService({
    // schemaRequestService: getSchemaRequestService(handledProtocols),
    workspaceContext,
    contributions: [],
    clientCapabilities: params.capabilities,
  });

  languageService.configure({
    schemas: [],
  });

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
      },
    },
  };

  return result;
});

connection.onCompletion(async (completionParams) => {
  const document = documents.get(completionParams.textDocument.uri);
  if (document) {
    const jsonDocument = getJsonDocument(document);
    const completionList = await languageService.doComplete(
      document,
      completionParams.position,
      jsonDocument
    );
    console.log(completionList);
    return completionList;
  }

  return null;
});

function getJsonDocument(document: TextDocument) {
  return jsonDocumentMapper.get(document);
}

connection.listen();
