import { nxWorkspace } from '@nx-console/language-server/workspace';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';

import { createCompletionItem } from './create-completion-path-item';

export async function projectTargetCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const { workspace } = await nxWorkspace(workingPath);

  const projectTargetCompletion: CompletionItem[] = [];

  const completionItemKind = CompletionItemKind.Field;

  for (const [projectName, configuration] of Object.entries(
    workspace.projects
  )) {
    for (const [targetName, target] of Object.entries(
      configuration.targets ?? {}
    )) {
      const targetLabel = `${projectName}:${targetName}`;
      projectTargetCompletion.push(
        createCompletionItem(
          targetLabel,
          '',
          node,
          document,
          completionItemKind
        )
      );

      for (const configuration of Object.keys(target.configurations ?? {})) {
        const configurationLabel = `${targetLabel}:${configuration}`;
        projectTargetCompletion.push(
          createCompletionItem(
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

  return projectTargetCompletion;
}
