import {
  findProjectRoot,
  isStringNode,
  lspLogger,
} from '@nx-console/language-server-utils';
import { join } from 'path';
import { ASTNode } from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';

export async function interpolatedPathLink(
  workingPath: string,
  node: ASTNode,
): Promise<string | undefined> {
  if (!isStringNode(node)) {
    return;
  }

  let value = node.value;
  if (value.startsWith('!')) {
    value = value.substring(1);
  }

  let path: string | undefined;

  if (value.startsWith('{workspaceRoot}')) {
    path = value.replace('{workspaceRoot}', workingPath);
  } else if (value.startsWith('{projectRoot}')) {
    const projectRoot = findProjectRoot(node);
    if (projectRoot) {
      path = value.replace('{projectRoot}', join(workingPath, projectRoot));
    }
  }

  if (path) {
    return URI.from({
      scheme: 'file',
      path: path,
    }).toString();
  }

  return;
}
