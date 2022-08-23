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
  if (!workingPath) {
    return [];
  }

  const items = completionItems(workingPath, node, document);

  if (hasCompletionType(schema)) {
    const completion = schema[X_COMPLETION_TYPE];
    if (hasCompletionGlob(schema)) {
      return items(completion, schema[X_COMPLETION_GLOB]);
    }

    return items(completion);
  } else {
    return [];
  }
}

function completionItems(
  workingPath: string,
  node: ASTNode,
  document: TextDocument
) {
  return async (
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
}
