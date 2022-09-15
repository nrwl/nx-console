import {
  findProjectRoot,
  isStringNode,
} from '@nx-console/language-server/utils';
import fastGlob from 'fast-glob';
import {
  ASTNode,
  CompletionItem,
  CompletionItemKind,
  TextDocument,
} from 'vscode-json-languageservice';
import { createCompletionItem } from './create-completion-path-item';

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

  const completionKind =
    searchType === 'directory'
      ? CompletionItemKind.Folder
      : CompletionItemKind.File;

  for (const file of files) {
    if (
      supportsInterpolation &&
      file.path.startsWith(workingPath + '/' + projectRoot)
    ) {
      const label =
        '{projectRoot}' +
        file.path.replace(workingPath + '/' + projectRoot, '');

      items.push(
        createCompletionItem(label, file.path, node, document, completionKind)
      );
    }

    if (file.path.startsWith(workingPath)) {
      const label = file.path.replace(workingPath + '/', '');
      items.push(
        createCompletionItem(label, file.path, node, document, completionKind)
      );

      if (supportsInterpolation) {
        const label = '{workspaceRoot}' + file.path.replace(workingPath, '');
        items.push(
          createCompletionItem(label, file.path, node, document, completionKind)
        );
      }
    }
  }

  return items;
}
