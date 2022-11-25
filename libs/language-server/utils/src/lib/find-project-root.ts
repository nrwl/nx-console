import { ASTNode } from 'vscode-json-languageservice';

import { isObjectNode, isPropertyNode, isStringNode } from './node-types';

/**
 * Get the first `root` property from the current node to determine `${projectRoot}`
 * @param node
 * @returns
 */
export function findProjectRoot(node: ASTNode): string {
  if (isObjectNode(node)) {
    for (const child of node.children) {
      if (isPropertyNode(child)) {
        if (
          (child.keyNode.value === 'root' ||
            child.keyNode.value === 'sourceRoot') &&
          isStringNode(child.valueNode)
        ) {
          return child.valueNode?.value;
        }
      }
    }
  }

  if (node.parent) {
    return findProjectRoot(node.parent);
  }

  return '';
}
