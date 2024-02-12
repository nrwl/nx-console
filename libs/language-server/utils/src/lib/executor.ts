import { ASTNode, StringASTNode } from 'vscode-json-languageservice';
import { isPropertyNode, isStringNode } from './node-types';

export function isExecutorStringNode(node: ASTNode): node is StringASTNode {
  return (
    isStringNode(node) &&
    isPropertyNode(node.parent) &&
    node.parent.keyNode.value === 'executor'
  );
}
