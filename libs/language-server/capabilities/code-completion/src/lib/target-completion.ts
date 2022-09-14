import { nxWorkspace } from '@nx-console/shared/workspace';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionPathItem } from './create-completion-path-item';

export async function targetCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const { workspace } = await nxWorkspace(workingPath);

  const targetCompletion: CompletionItem[] = [];

  const completionItemKind = CompletionItemKind.Field;

  for (const [projectName, configuration] of Object.entries(
    workspace.projects
  )) {
    for (const [targetName, target] of Object.entries(
      configuration.targets ?? {}
    )) {
      const targetLabel = `${projectName}:${targetName}`;
      targetCompletion.push(
        createCompletionPathItem(
          targetLabel,
          '',
          node,
          document,
          completionItemKind
        )
      );

      for (const configuration of Object.keys(target.configurations ?? {})) {
        const configurationLabel = `${targetLabel}:${configuration}`;
        targetCompletion.push(
          createCompletionPathItem(
            configurationLabel,
            '',
            node,
            document,
            completionItemKind
          )
        );
      }
    }
  }

  return targetCompletion;
}
