import { parseTargetString } from '@nx/devkit/src/executors/parse-target-string';
import { fileExists, readFile } from '@nx-console/shared/file-system';
import {
  findProperty,
  getLanguageModelCache,
  isStringNode,
  lspLogger,
} from '@nx-console/language-server/utils';
import { nxWorkspace } from '@nx-console/language-server/workspace';
import { join } from 'path';
import {
  ASTNode,
  JSONDocument,
  Range,
  TextDocument,
} from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';
import { createRange } from './create-range';

const tempDocumentCounter = new Map<string, number>();

export async function targetLink(
  workingPath: string,
  node: ASTNode
): Promise<string | undefined> {
  if (!isStringNode(node)) {
    return;
  }

  const targetString = node.value;
  let project, target, configuration;
  try {
    const parsedTargets = parseTargetString(targetString);
    project = parsedTargets.project;
    target = parsedTargets.target;
    configuration = parsedTargets.configuration;
  } catch (e) {
    return;
  }

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

  const projectJson = await readFile(baseTargetProjectPath);

  let versionNumber = 0;
  if (tempDocumentCounter.has(baseTargetProjectPath)) {
    versionNumber = tempDocumentCounter.get(baseTargetProjectPath) ?? 0;
    tempDocumentCounter.set(baseTargetProjectPath, versionNumber + 1);
  } else {
    tempDocumentCounter.set(baseTargetProjectPath, versionNumber);
  }

  const languageModelCache = getLanguageModelCache();
  const { document, jsonAst } = languageModelCache.retrieve(
    TextDocument.create(
      baseTargetProjectPath,
      'json',
      versionNumber,
      projectJson
    ),
    false
  );
  languageModelCache.dispose();

  const range = findTargetRange(document, jsonAst, target, configuration);

  if (!range) {
    return;
  }

  return URI.from({
    scheme: 'file',
    path: baseTargetProjectPath,
    fragment: `${range.start.line + 1}`,
  }).toString();
}

function findTargetRange(
  document: TextDocument,
  jsonAst: JSONDocument,
  target: string,
  configuration: string | undefined
): Range | undefined {
  if (!jsonAst.root) {
    return;
  }

  const targetNode = findProperty(jsonAst.root, 'targets');

  if (!targetNode) {
    return;
  }

  // Find the target within the target object
  const targetProperty = findProperty(targetNode, target);

  if (!targetProperty) {
    return;
  }

  if (configuration) {
    const configurationNode = findProperty(targetProperty, configuration);

    if (configurationNode) {
      return createRange(document, configurationNode);
    }
  } else {
    return createRange(document, targetProperty);
  }
}
