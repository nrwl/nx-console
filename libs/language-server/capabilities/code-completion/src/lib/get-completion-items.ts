import {
  CompletionType,
  hasCompletionGlob,
  hasCompletionType,
  X_COMPLETION_GLOB,
  X_COMPLETION_TYPE,
} from '@nx-console/json-schema';
import { getDefaultCompletionType } from '@nx-console/language-server/utils';
import {
  ASTNode,
  CompletionItem,
  JSONDocument,
  MatchingSchema,
  Position,
  TextDocument,
} from 'vscode-json-languageservice';
import { pathCompletion } from './path-completion';
import { targetCompletion } from './target-completion';

export async function getCompletionItems(
  workingPath: string | undefined,
  jsonAst: JSONDocument,
  document: TextDocument,
  schemas: MatchingSchema[],
  position: Position
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const offset = document.offsetAt(position);
  const node = jsonAst.getNodeFromOffset(offset);
  if (!node) {
    return [];
  }

  const items = completionItems(workingPath, node, document);

  for (const { schema, node: schemaNode } of schemas) {
    // Find the schema node that matches the current node
    // If the node is found, then we will return the whole function so that we don't have to loop over the rest of the items.
    if (schemaNode == node) {
      if (hasCompletionType(schema)) {
        const completion = schema[X_COMPLETION_TYPE];
        if (hasCompletionGlob(schema)) {
          return items(completion, schema[X_COMPLETION_GLOB]);
        }

        return items(completion);
      }
    }
  }

  const defaultCompletion = getDefaultCompletionType(node);

  if (defaultCompletion) {
    return items(defaultCompletion.completionType, defaultCompletion.glob);
  }

  return [];
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
          glob: glob ?? '*.*',
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
