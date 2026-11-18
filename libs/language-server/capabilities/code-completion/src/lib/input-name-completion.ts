import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';
import {
  getProjectNamedInputs,
  lspLogger,
} from '@nx-console/language-server-utils';

export async function inputNameCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
  hasDependencyHat = false,
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const inputNameCompletion: CompletionItem[] = [];

  const { nxJson } = await nxWorkspace(workingPath, lspLogger);

  const workspaceInputs = new Set(Object.keys(nxJson.namedInputs ?? {}));
  const projectInputs = getProjectNamedInputs(document.uri, node).map(
    (property) => property.keyNode.value,
  );

  for (const inputName of new Set([...workspaceInputs, ...projectInputs])) {
    if (hasDependencyHat && workspaceInputs.has(inputName)) {
      inputNameCompletion.push(
        createCompletionItem(
          `^${inputName}`,
          '',
          node,
          document,
          CompletionItemKind.Property,
          `Base "${inputName}" on this project's dependencies`,
        ),
      );
    }
    inputNameCompletion.push(
      createCompletionItem(
        inputName,
        '',
        node,
        document,
        CompletionItemKind.Property,
      ),
    );
  }

  return inputNameCompletion;
}
