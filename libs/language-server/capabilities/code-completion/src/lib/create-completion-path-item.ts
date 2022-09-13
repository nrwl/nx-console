import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';

export function createCompletionItem(
  label: string,
  path: string,
  node: ASTNode,
  document: TextDocument,
  kind: CompletionItemKind
): CompletionItem {
  const startPosition = document.positionAt(node.offset);
  const endPosition = document.positionAt(node.offset + node.length);
  label = `"${label}"`;
  return {
    label,
    kind,
    insertText: label,
    insertTextFormat: 2,
    textEdit: {
      newText: label,
      range: {
        start: startPosition,
        end: endPosition,
      },
    },
    detail: path,
  };
}
