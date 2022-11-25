import { ASTNode } from 'vscode-json-languageservice';

import { isObjectNode, isPropertyNode } from './node-types';

/**
 * Find the first property from the current node
 * @param node
 * @param property
 */
export function findProperty(
  node: ASTNode | undefined,
  property: string
): ASTNode | undefined {
  if (isPropertyNode(node) && node.valueNode) {
    node = node.valueNode;
  }

  if (isObjectNode(node)) {
    for (const child of node.properties) {
      if (child.keyNode.value === property) {
        return child;
      }

      if (isObjectNode(child.valueNode)) {
        const found = findProperty(child.valueNode, property);
        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
}
