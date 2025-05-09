import { isArrayNode, lspLogger } from '@nx-console/language-server-utils';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';

export async function tagsCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const tagCompletion: CompletionItem[] = [];

  const { projectGraph } = await nxWorkspace(workingPath, lspLogger);
  const tags = new Set<string>();
  for (const projectConfiguration of Object.values(projectGraph.nodes)) {
    for (const tag of projectConfiguration.data.tags ?? []) {
      tags.add(tag);
    }
  }

  const existingTags = getTagsOnCurrentNode(node);

  for (const tag of tags) {
    if (existingTags.has(tag)) {
      continue;
    }

    tagCompletion.push(
      createCompletionItem(
        tag,
        '',
        node,
        document,
        CompletionItemKind.Constant,
      ),
    );
  }

  return tagCompletion;
}

function getTagsOnCurrentNode(node: ASTNode): Set<string> {
  const parent = node.parent;
  if (!isArrayNode(parent)) {
    return new Set();
  }

  return new Set(parent.items.map((item) => item.value as string));
}
