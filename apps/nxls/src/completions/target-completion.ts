import {
  ASTNode,
  CompletionItem,
  TextDocument,
} from 'vscode-json-languageservice';

export async function targetCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument
): Promise<CompletionItem[]> {
  return [];
}
