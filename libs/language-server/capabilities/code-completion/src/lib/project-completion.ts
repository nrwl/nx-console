import { nxWorkspace } from '@nx-console/workspace';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';

export async function projectCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const { workspace } = await nxWorkspace(workingPath);

  const projectCompletion: CompletionItem[] = [];

  for (const projectName of Object.keys(workspace.projects)) {
    projectCompletion.push(
      createCompletionItem(
        projectName,
        '',
        node,
        document,
        CompletionItemKind.Struct
      ),
      createCompletionItem(
        `!${projectName}`,
        '',
        node,
        document,
        CompletionItemKind.Struct,
        `Exclude "${projectName}" from this project's dependencies`
      )
    );
  }

  return projectCompletion;
}
