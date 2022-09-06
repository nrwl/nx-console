import { ASTNode, Range, TextDocument } from 'vscode-json-languageservice';

export function createRange(document: TextDocument, node: ASTNode) {
  const position = document.positionAt(node.offset);
  const endPosition = document.positionAt(node.offset + node.length);
  return Range.create(position, endPosition);
}
