import { basename } from 'path';
import { ASTNode, PropertyASTNode } from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';
import { isObjectNode } from './node-types';

export function getProjectNamedInputs(
  uri: string,
  node: ASTNode,
): PropertyASTNode[] {
  const file = basename(URI.parse(uri).fsPath);
  if (file !== 'project.json' && file !== 'package.json') {
    return [];
  }

  let root = node;
  while (root.parent) {
    root = root.parent;
  }

  const project = file === 'package.json' ? getPropertyValue(root, 'nx') : root;
  const namedInputs = getPropertyValue(project, 'namedInputs');
  return isObjectNode(namedInputs) ? namedInputs.properties : [];
}

function getPropertyValue(node: ASTNode | undefined, key: string) {
  return isObjectNode(node)
    ? node.properties.find((property) => property.keyNode.value === key)
        ?.valueNode
    : undefined;
}
