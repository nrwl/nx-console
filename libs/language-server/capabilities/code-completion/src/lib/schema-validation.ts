import {
  getJsonLanguageService,
  LanguageModelCache,
  lspLogger,
} from '@nx-console/language-server-utils';
import { JSONDocument, TextDocument } from 'vscode-json-languageservice';
import { Connection } from 'vscode-languageserver';
import { TextDocuments } from 'vscode-languageserver/node';

/**
 * Schema problems are reported as warnings rather than errors: the schema is assembled from the
 * installed Nx package plus whatever executor schemas the workspace resolves, so a mismatch is a
 * strong hint rather than a certainty and should never look like a build failure.
 */
const VALIDATION_SETTINGS = {
  schemaValidation: 'warning',
  comments: 'ignore',
  trailingCommas: 'ignore',
} as const;

const VALIDATED_FILES = ['project.json', 'nx.json'];

export function isValidatedNxFile(uri: string): boolean {
  const fileName = uri.split(/[\\/]/).pop();
  return !!fileName && VALIDATED_FILES.includes(fileName);
}

export async function validateDocument(
  connection: Connection,
  document: TextDocument,
  jsonDocumentMapper: LanguageModelCache<JSONDocument>,
) {
  if (!isValidatedNxFile(document.uri)) {
    return;
  }
  const jsonLanguageService = getJsonLanguageService();
  if (!jsonLanguageService) {
    return;
  }
  try {
    // The cache hands back the document with the `$schema` line blanked out. Validating that one
    // keeps the file from being checked twice against the schema it points at, and blanking leaves
    // every other line where it was, so the reported ranges still line up with what the user sees.
    const { jsonAst, document: parsedDocument } =
      jsonDocumentMapper.retrieve(document);
    const diagnostics = await jsonLanguageService.doValidation(
      parsedDocument,
      jsonAst,
      VALIDATION_SETTINGS,
    );
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
  } catch (e) {
    lspLogger.log(`Unable to validate ${document.uri}: ${e}`);
  }
}

export function clearDiagnostics(connection: Connection, uri: string) {
  if (!isValidatedNxFile(uri)) {
    return;
  }
  connection.sendDiagnostics({ uri, diagnostics: [] });
}

/**
 * The schemas are built from the project graph, so what a file validates against changes whenever
 * the workspace is reconfigured. Re-run every open document rather than leaving stale warnings.
 */
export async function revalidateOpenDocuments(
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  jsonDocumentMapper: LanguageModelCache<JSONDocument>,
) {
  for (const document of documents.all()) {
    await validateDocument(connection, document, jsonDocumentMapper);
  }
}
