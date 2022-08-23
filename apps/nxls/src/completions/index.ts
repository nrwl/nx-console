import {
  ASTNode,
  CompletionItem,
  JSONSchema,
  TextDocument,
} from 'vscode-json-languageservice';
import {
  CompletionType,
  hasCompletionGlob,
  hasCompletionType,
  X_COMPLETION_GLOB,
  X_COMPLETION_TYPE,
} from '@nx-console/json-schema';
import { pathCompletion } from './path-completion';
import { targetCompletion } from './target-completion';

export async function getCompletionItems(
  workingPath: string | undefined,
  schema: JSONSchema,
  node: ASTNode,
  document: TextDocument
): Promise<CompletionItem[]> {
  const items: Array<CompletionItem> = [];

  if (!workingPath) {
    return items;
  }

  const completionItems = async (
    completion: CompletionType,
    glob?: string
  ): Promise<CompletionItem[]> => {
    switch (completion) {
      case 'file': {
        return pathCompletion(workingPath, node, document, {
          glob: glob ?? '**/*.*',
          searchType: 'file',
        });
      }
      case 'directory': {
        return pathCompletion(workingPath, node, document, {
          glob: glob ?? '*',
          searchType: 'directory',
        });
      }
      case 'target': {
        return targetCompletion(workingPath, node, document);
      }
      default: {
        return [];
      }
    }
  };

  if (hasCompletionType(schema)) {
    const completion = schema[X_COMPLETION_TYPE];
    if (hasCompletionGlob(schema)) {
      return completionItems(completion, schema[X_COMPLETION_GLOB]);
    }

    return completionItems(completion);
  } else {
    return [];
  }
}
