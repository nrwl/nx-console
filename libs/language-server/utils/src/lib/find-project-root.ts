import { ASTNode } from 'vscode-json-languageservice';
import { isObjectNode, isPropertyNode, isStringNode } from './node-types';

/**
 * Get the closest `root` property from the current node to determine `{projectRoot}`.
 * `sourceRoot` is not a project root, so it is never used. Generated project.json
 * files have no `root`, so callers pass the directory of the document as a fallback.
 * @param node
 * @param fallback project root to use when no `root` property is found
 * @returns
 */
export function findProjectRoot(node: ASTNode, fallback = ''): string {
  if (isObjectNode(node)) {
    for (const child of node.children) {
      if (
        isPropertyNode(child) &&
        child.keyNode.value === 'root' &&
        isStringNode(child.valueNode)
      ) {
        return child.valueNode.value;
      }
    }
  }

  if (node.parent) {
    return findProjectRoot(node.parent, fallback);
  }

  return fallback;
}
