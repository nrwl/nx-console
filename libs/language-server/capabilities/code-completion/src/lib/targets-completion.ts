import { isArrayNode } from '@nx-console/language-server/utils';
import { nxWorkspace } from '@nx-console/language-server/workspace';
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

  const existingTargets = getTargetsOnCurrentNode(node);

  for (const targetName of targetNames) {
    if (existingTargets.has(targetName)) {
      continue;
    }

    if (hasDependencyHat) {
      const dependencyHat = `^${targetName}`;
      if (existingTargets.has(dependencyHat)) {
        continue;
      }

      targetsCompletion.push(
        createCompletionItem(
          dependencyHat,
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
        CompletionItemKind.Field
      )
    );
  }

  return targetsCompletion;
}

function getTargetsOnCurrentNode(node: ASTNode) {
  const parent = node.parent;
  if (!isArrayNode(parent)) {
    return new Set();
  }

  return new Set(parent.items.map((item) => item.value as string));
}
