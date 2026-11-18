import {
  findProperty,
  getJsonLanguageService,
  getLanguageModelCache,
  getProjectNamedInputs,
  isStringNode,
} from '@nx-console/language-server-utils';
import {
  CompletionType,
  X_COMPLETION_TYPE,
} from '@nx-console/shared-json-schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ASTNode,
  JSONDocument,
  Position,
  Range,
  TextDocument,
} from 'vscode-json-languageservice';
import { LocationLink } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { createRange } from './create-range';
import { readNxJson } from '@nx-console/shared-npm';

let versionNumber = 0;

export async function namedInputLink(
  workingPath: string,
  node: ASTNode,
  source: TextDocument,
): Promise<string | undefined> {
  if (!isStringNode(node) || node.value.startsWith('^')) {
    return;
  }

  const localInput = findProjectNamedInput(source, node);
  if (localInput) {
    const line = source.positionAt(localInput.keyNode.offset).line + 1;
    return URI.parse(source.uri)
      .with({ fragment: String(line) })
      .toString();
  }

  const nxJson = await readNxJson(workingPath);

  const namedInput = Object.keys(nxJson.namedInputs ?? {}).find(
    (input) => input === node.value,
  );

  if (!namedInput) {
    return;
  }

  const nxJsonPath = join(workingPath, 'nx.json');

  const nxJsonContent = readFileSync(join(workingPath, 'nx.json'), 'utf8');

  const languageModelCache = getLanguageModelCache();
  const { document, jsonAst } = languageModelCache.retrieve(
    TextDocument.create(nxJsonPath, 'json', versionNumber, nxJsonContent),
    false,
  );
  languageModelCache.dispose();
  versionNumber++;

  const range = findNamedInputRange(document, jsonAst, namedInput);

  if (!range) {
    return;
  }

  return URI.from({
    scheme: 'file',
    path: nxJsonPath,
    fragment: `${range.start.line + 1}`,
  }).toString();
}

function findNamedInputRange(
  document: TextDocument,
  jsonAst: JSONDocument,
  namedInput: string,
): Range | undefined {
  if (!jsonAst.root) {
    return;
  }

  const namedInputNode = findProperty(jsonAst.root, 'namedInputs');

  if (!namedInputNode) {
    return;
  }

  const namedInputProperty = findProperty(namedInputNode, namedInput);

  if (!namedInputProperty) {
    return;
  }

  return createRange(document, namedInputProperty);
}

function findProjectNamedInput(document: TextDocument, node: ASTNode) {
  if (!isStringNode(node) || node.value.startsWith('^')) {
    return;
  }

  return getProjectNamedInputs(document.uri, node).find(
    (property) => property.keyNode.value === node.value,
  );
}

export async function getProjectNamedInputDefinition(
  document: TextDocument,
  jsonAst: JSONDocument,
  position: Position,
): Promise<LocationLink[] | undefined> {
  const node = jsonAst.getNodeFromOffset(document.offsetAt(position));
  if (!node) {
    return;
  }

  const input = findProjectNamedInput(document, node);
  if (!input) {
    return;
  }

  const schemas = await getJsonLanguageService()?.getMatchingSchemas(
    document,
    jsonAst,
  );
  const isNamedInput = schemas?.some(
    ({ schema, node: schemaNode }) =>
      schemaNode === node &&
      (schema[X_COMPLETION_TYPE] === CompletionType.inputName ||
        schema[X_COMPLETION_TYPE] === CompletionType.inputNameWithDeps),
  );
  if (!isNamedInput) {
    return;
  }

  // Document link clients can ignore URI fragments. A definition carries the exact range.
  return [
    LocationLink.create(
      document.uri,
      createRange(document, input),
      createRange(document, input.keyNode),
      createRange(document, node),
    ),
  ];
}
