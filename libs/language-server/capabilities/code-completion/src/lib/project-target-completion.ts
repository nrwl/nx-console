import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';
export async function projectTargetCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const { projectGraph } = await nxWorkspace(workingPath, lspLogger);

  const projectTargetCompletion: CompletionItem[] = [];

  const completionItemKind = CompletionItemKind.Field;

  for (const [projectName, configuration] of Object.entries(
    projectGraph.nodes,
  )) {
    for (const [targetName, target] of Object.entries(
      configuration.data.targets ?? {},
    )) {
      const targetLabel = `${projectName}:${targetName}`;
      projectTargetCompletion.push(
        createCompletionItem(
          targetLabel,
          '',
          node,
          document,
          completionItemKind,
        ),
      );

      for (const configuration of Object.keys(target.configurations ?? {})) {
        const configurationLabel = `${targetLabel}:${configuration}`;
        projectTargetCompletion.push(
          createCompletionItem(
            configurationLabel,
            '',
            node,
            document,
            completionItemKind,
          ),
        );
      }
    }
  }

  return projectTargetCompletion;
}
