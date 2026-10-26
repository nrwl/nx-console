import {
  findProjectRoot,
  getDefaultCompletionType,
  hasDefaultCompletionType,
  isStringNode,
} from '@nx-console/language-server-utils';
import { fileExists } from '@nx-console/shared-file-system';
import {
  CompletionType,
  hasCompletionType,
  X_COMPLETION_TYPE,
} from '@nx-console/shared-json-schema';
import { dirname, isAbsolute, join, relative } from 'path';
import {
  DocumentLink,
  JSONDocument,
  MatchingSchema,
  TextDocument,
} from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';
import { createRange } from './create-range';
import { targetLink } from './target-link';
import { namedInputLink } from './named-input-link';
import { projectLink } from './project-link';
import { interpolatedPathLink } from './interpolated-path-link';

export async function getDocumentLinks(
  workingPath: string | undefined,
  jsonAst: JSONDocument,
  document: TextDocument,
  schemas: MatchingSchema[],
): Promise<DocumentLink[]> {
  if (!workingPath) {
    return [];
  }

  const links: DocumentLink[] = [];

  if (!jsonAst.root) {
    return [];
  }

  const documentDirectory = getDocumentDirectory(workingPath, document);
  const projectRoot = findProjectRoot(jsonAst.root, documentDirectory);
  const projectRootPath = join(workingPath, projectRoot);

  for (const { schema, node } of schemas) {
    let linkType: CompletionType | undefined;
    if (hasCompletionType(schema)) {
      linkType = schema[X_COMPLETION_TYPE];
    } else if (hasDefaultCompletionType(node)) {
      linkType = getDefaultCompletionType(node)?.completionType;
    }

    if (!linkType) {
      if (isStringNode(node)) {
        const value = node.value;
        if (
          (value.startsWith('{workspaceRoot}') ||
            value.startsWith('{projectRoot}') ||
            value.startsWith('!{workspaceRoot}') ||
            value.startsWith('!{projectRoot}')) &&
          !value.includes('*')
        ) {
          const link = await interpolatedPathLink(
            workingPath,
            node,
            documentDirectory,
          );
          if (link) {
            links.push(DocumentLink.create(createRange(document, node), link));
          }
        }
      }
      continue;
    }

    if (linkType === 'directory') {
      continue;
    }

    const range = createRange(document, node);

    switch (linkType) {
      case 'file': {
        if (!isStringNode(node)) {
          continue;
        }

        const fullPath = join(workingPath, node.value);
        if (!(await fileExists(fullPath))) {
          continue;
        }

        if (node.value === projectRoot) {
          links.push({
            range,
            target: projectRootPath,
          });
        } else {
          links.push(DocumentLink.create(range, fullPath));
        }
        break;
      }
      case CompletionType.inputName:
      case CompletionType.inputNameWithDeps: {
        const link = await namedInputLink(workingPath, node);
        if (link) {
          links.push(DocumentLink.create(range, link));
        }
        break;
      }
      case 'projectTarget': {
        const link = await targetLink(workingPath, node);
        if (link) {
          links.push(DocumentLink.create(range, link));
        }
        break;
      }
      case CompletionType.projects: {
        const link = await projectLink(workingPath, node);
        if (link) {
          links.push(DocumentLink.create(range, link));
        }
        break;
      }
      default:
    }
  }

  return links;
}

/**
 * The directory of the document relative to the workspace, which is the project root
 * of a project.json or package.json that does not set `root`.
 */
function getDocumentDirectory(
  workingPath: string,
  document: TextDocument,
): string {
  const directory = relative(
    workingPath,
    dirname(URI.parse(document.uri).fsPath),
  );
  if (directory.startsWith('..') || isAbsolute(directory)) {
    return '';
  }
  return directory;
}
