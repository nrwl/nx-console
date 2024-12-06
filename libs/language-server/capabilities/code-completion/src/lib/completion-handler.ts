import {
  getJsonLanguageService,
  LanguageModelCache,
  mergeArrays,
} from '@nx-console/language-server/utils';
import { dirname, relative } from 'path';
import {
  ClientCapabilities,
  CompletionList,
  JSONDocument,
  TextDocument,
} from 'vscode-json-languageservice';
import { CompletionParams } from 'vscode-languageserver';
import { TextDocuments } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import {
  configureSchemaForProject,
  projectSchemaIsRegistered,
} from './schema-completion';
import { nxWorkspace } from '@nx-console/language-server/workspace';
import { getCompletionItems } from './get-completion-items';

export async function completionHandler(
  workspacePath: string,
  documents: TextDocuments<TextDocument>,
  completionParams: CompletionParams,
  jsonDocumentMapper: LanguageModelCache<JSONDocument>,
  clientCapabilities: ClientCapabilities | undefined
): Promise<CompletionList | null> {
  const changedDocument = documents.get(completionParams.textDocument.uri);
  if (!changedDocument) {
    return null;
  }

  const { jsonAst, document } = jsonDocumentMapper.retrieve(changedDocument);

  // get the project name from either the json AST (fast) or via the file path (slow)
  // if the project is not yet registered with the json language service, register it
  const uri = URI.parse(changedDocument.uri).fsPath;
  if (uri.endsWith('project.json')) {
    let relativeRootPath = relative(workspacePath, dirname(uri));
    // the root project will have a path of '' while nx thinks of the path as '.'
    if (relativeRootPath === '') {
      relativeRootPath = '.';
    }

    if (relativeRootPath && !projectSchemaIsRegistered(relativeRootPath)) {
      await configureSchemaForProject(
        relativeRootPath,
        workspacePath,
        clientCapabilities
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

  const { nxVersion } = await nxWorkspace(workspacePath);

  const pathItems = await getCompletionItems(
    workspacePath,
    nxVersion,
    jsonAst,
    document,
    schemas,
    completionParams.position
  );

  mergeArrays(completionResults.items, pathItems);

  return completionResults;
}
