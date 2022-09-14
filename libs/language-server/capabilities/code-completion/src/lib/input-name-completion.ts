import { nxWorkspace } from '@nx-console/workspace';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';

export async function inputNameCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
  hasDependencyHat = false
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const inputNameCompletion: CompletionItem[] = [];

  const { workspace } = await nxWorkspace(workingPath);

  for (const inputName of Object.keys(workspace.namedInputs ?? {})) {
    if (hasDependencyHat) {
      inputNameCompletion.push(
        createCompletionItem(
          `^${inputName}`,
          '',
          node,
          document,
          CompletionItemKind.Property,
          `Base "${inputName}" on this project's dependencies`
        )
      );
    }
    inputNameCompletion.push(
      createCompletionItem(
        inputName,
        '',
        node,
        document,
        CompletionItemKind.Property
      )
    );
  }

  return inputNameCompletion;
}
