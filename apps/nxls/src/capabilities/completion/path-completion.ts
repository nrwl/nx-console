import fastGlob from 'fast-glob';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { isStringNode } from '../../utils/node-types';
import { findProjectRoot } from '../../utils/find-project-root';

export async function pathCompletion(
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
