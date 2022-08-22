import fastGlob from 'fast-glob';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
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
import {
  isObjectNode,
  isPropertyNode,
  isStringNode,
} from '../utils/node-types';

export async function getPathCompletionItems(
  workingPath: string | undefined,
  schema: JSONSchema,
  node: ASTNode,
  document: TextDocument
): Promise<CompletionItem[]> {
  const items: Array<CompletionItem> = [];

  if (!workingPath) {
    return items;
  }

  const pathItems = async (
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
      default: {
        return [];
      }
    }
  };

  if (hasCompletionType(schema)) {
    const completion = schema[X_COMPLETION_TYPE];
    if (hasCompletionGlob(schema)) {
      return pathItems(completion, schema[X_COMPLETION_GLOB]);
    }

    return pathItems(completion);
  } else {
    return [];
  }
}

async function pathCompletion(
  workingPath: string | undefined,
  node: ASTNode,
  document: TextDocument,
  options?: {
    glob: string;
    searchType: 'file' | 'directory';
    supportsInterpolation?: boolean;
  }
): Promise<CompletionItem[]> {
  const items: CompletionItem[] = [];

  if (!workingPath) {
    return items;
  }

  const { supportsInterpolation, glob, searchType } = {
    supportsInterpolation: false,
    ...options,
  };

  if (!isStringNode(node)) {
    return items;
  }

  const projectRoot = findProjectRoot(node);

  const files = await fastGlob([workingPath + '/**/' + glob], {
    ignore: ['**/node_modules/**'],
    dot: true,
    onlyFiles: searchType === 'file',
    onlyDirectories: searchType === 'directory',
    objectMode: true,
  });

  for (const file of files) {
    if (
      supportsInterpolation &&
      file.path.startsWith(workingPath + '/' + projectRoot)
    ) {
      const label =
        '{projectRoot}' +
        file.path.replace(workingPath + '/' + projectRoot, '');

      items.push(addCompletionPathItem(label, file.path, node, document));
    }

    if (file.path.startsWith(workingPath)) {
      const label = file.path.replace(workingPath + '/', '');
      items.push(addCompletionPathItem(label, file.path, node, document));

      if (supportsInterpolation) {
        const label = '{workspaceRoot}' + file.path.replace(workingPath, '');
        items.push(addCompletionPathItem(label, file.path, node, document));
      }
    }
  }

  return items;
}

/**
 * Get the first `root` property from the current node to determine `${projectRoot}`
 * @param node
 * @returns
 */
function findProjectRoot(node: ASTNode): string {
  if (isObjectNode(node)) {
    for (const child of node.children) {
      if (isPropertyNode(child)) {
        if (child.keyNode.value === 'root' && isStringNode(child.valueNode)) {
          return child.valueNode?.value;
        }
      }
    }
  }

  if (node.parent) {
    return findProjectRoot(node.parent);
  }

  return '';
}

function addCompletionPathItem(
  label: string,
  path: string,
  node: ASTNode,
  document: TextDocument
): CompletionItem {
  const startPosition = document.positionAt(node.offset);
  const endPosition = document.positionAt(node.offset + node.length);
  label = `"${label}"`;
  return {
    label,
    kind: CompletionItemKind.File,
    insertText: label,
    insertTextFormat: 2,
    textEdit: {
      newText: label,
      range: {
        start: startPosition,
        end: endPosition,
      },
    },
    detail: path,
  };
}
