import { parseTargetString } from '@nrwl/devkit';
import { fileExists, readAndCacheJsonFile } from '@nx-console/file-system';
import {
  CompletionType,
  hasCompletionType,
  X_COMPLETION_TYPE,
} from '@nx-console/json-schema';
import {
  findProjectRoot,
  getDefaultCompletionType,
  getLanguageModelCache,
  hasDefaultCompletionType,
  isStringNode,
  lspLogger,
} from '@nx-console/language-server/utils';
import { nxWorkspace } from '@nx-console/workspace';
import { join } from 'path';
import {
  ASTNode,
  DocumentLink,
  JSONDocument,
  MatchingSchema,
  Range,
  TextDocument,
} from 'vscode-json-languageservice';

export async function getDocumentLinks(
  workingPath: string | undefined,
  jsonAst: JSONDocument,
  document: TextDocument,
  schemas: MatchingSchema[]
): Promise<DocumentLink[]> {
  if (!workingPath) {
    return [];
  }

  const links: DocumentLink[] = [];

  if (!jsonAst.root) {
    return [];
  }

  const projectRoot = findProjectRoot(jsonAst.root);
  const projectRootPath = join(workingPath, projectRoot);

  for (const { schema, node } of schemas) {
    let linkType: CompletionType | undefined;
    if (hasCompletionType(schema)) {
      linkType = schema[X_COMPLETION_TYPE];
    } else if (hasDefaultCompletionType(node)) {
      linkType = getDefaultCompletionType(node)?.completionType;
    }

    if (!linkType) {
      continue;
    }

    if (linkType === 'directory') {
      continue;
    }

    const position = document.positionAt(node.offset);
    const endPosition = document.positionAt(node.offset + node.length);
    const range = Range.create(position, endPosition);

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
      case 'target': {
        const targetLink = await getTargetLink(workingPath, node);
        if (targetLink) {
          links.push(targetLink);
        }
        break;
      }
      default:
    }
  }

  return links;
}

async function getTargetLink(
  workingPath: string,
  node: ASTNode
): Promise<DocumentLink | undefined> {
  if (!isStringNode(node)) {
    return;
  }

  const targetString = node.value;
  const { project, target, configuration } = parseTargetString(targetString);

  const { workspace } = await nxWorkspace(workingPath, lspLogger);

  const workspaceProject = workspace.projects[project];

  if (!workspaceProject) {
    lspLogger.log(`Could not find project ${project}`);
    return;
  }

  const baseTargetPath = join(workingPath, workspaceProject.root);
  const baseTargetProjectPath = join(baseTargetPath, 'project.json');

  if (!(await fileExists(baseTargetProjectPath))) {
    lspLogger.log(`Could not find target project: ${baseTargetProjectPath}`);
    return;
  }

  const { json: projectContents } = await readAndCacheJsonFile(
    baseTargetProjectPath
  );

  const {} = getLanguageModelCache();

  return;
}
