import {
  findProperty,
  getLanguageModelCache,
} from '@nx-console/language-server-utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ASTNode,
  JSONDocument,
  Range,
  TextDocument,
} from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';
import { createRange } from './create-range';
import { readNxJson } from '@nx-console/shared-npm';

let versionNumber = 0;

export async function namedInputLink(
  workingPath: string,
  node: ASTNode,
): Promise<string | undefined> {
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
