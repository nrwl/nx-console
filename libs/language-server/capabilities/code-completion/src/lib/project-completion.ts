import { nxWorkspace } from '@nx-console/language-server/workspace';
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
  document: TextDocument,
  includeDeps = false
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
      )
    );
    if (!includeDeps) {
      projectCompletion.push(
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
  }

  if (includeDeps) {
    projectCompletion.push(
      createCompletionItem(
        '{self}',
        '',
        node,
        document,
        CompletionItemKind.Struct,
        "Include this project's targets"
      ),
      createCompletionItem(
        '{dependencies}',
        '',
        node,
        document,
        CompletionItemKind.Struct,
        "Include this project's dependency's targets"
      )
    );
  }

  return projectCompletion;
}
