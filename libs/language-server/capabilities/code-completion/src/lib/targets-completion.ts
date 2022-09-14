import { nxWorkspace } from '@nx-console/workspace';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';

export async function targetsCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
  hasDependencyHat = false
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const targetsCompletion: CompletionItem[] = [];
  const { workspace } = await nxWorkspace(workingPath);

  const targetNames = new Set<string>();
  for (const project of Object.values(workspace.projects)) {
    for (const targetName of Object.keys(project.targets ?? {})) {
      targetNames.add(targetName);
    }
  }

  for (const targetName of targetNames) {
    if (hasDependencyHat) {
      targetsCompletion.push(
        createCompletionItem(
          `^${targetName}`,
          '',
          node,
          document,
          CompletionItemKind.Field,
          `Run all dependencies that have "${targetName}" as a target before this one`
        )
      );
    }
    targetsCompletion.push(
      createCompletionItem(
        targetName,
        '',
        node,
        document,
        CompletionItemKind.Field,
        `Run the "${targetName}" target before this one`
      )
    );
  }

  return targetsCompletion;
}
