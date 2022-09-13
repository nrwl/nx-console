import {
  ArrayASTNode,
  ASTNode,
  ObjectASTNode,
  PropertyASTNode,
  StringASTNode,
} from 'vscode-json-languageservice';

export function isPropertyNode(node?: ASTNode): node is PropertyASTNode {
  return node?.type === 'property';
}

export function isObjectNode(node?: ASTNode): node is ObjectASTNode {
  return node?.type === 'object';
}

export function isStringNode(node?: ASTNode): node is StringASTNode {
  return node?.type === 'string';
}

export function isArrayNode(node?: ASTNode): node is ArrayASTNode {
  return node?.type === 'array';
}
