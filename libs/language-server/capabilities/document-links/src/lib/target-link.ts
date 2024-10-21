import { fileExists, readFile } from '@nx-console/shared/file-system';
import {
  findProperty,
  getLanguageModelCache,
  isStringNode,
  lspLogger,
} from '@nx-console/language-server/utils';
import {
  getNxVersion,
  nxWorkspace,
} from '@nx-console/language-server/workspace';
import { join } from 'path';
import {
  ASTNode,
  JSONDocument,
  Range,
  TextDocument,
} from 'vscode-json-languageservice';
import { URI } from 'vscode-uri';
import { createRange } from './create-range';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '@nx-console/shared/npm';
import { gte } from 'semver';
import type { ProjectGraph, Target } from 'nx/src/devkit-exports';

const tempDocumentCounter = new Map<string, number>();

export async function targetLink(
  workingPath: string,
  node: ASTNode
): Promise<string | undefined> {
  if (!isStringNode(node)) {
    return;
  }

  const { workspace } = await nxWorkspace(workingPath, lspLogger);

  const targetString = node.value;
  let project, target, configuration;
  try {
    const devkitPath = await workspaceDependencyPath(workingPath, '@nx/devkit');
    if (!devkitPath) {
      lspLogger.log(
        `Unable to load the "@nx/devkit" package from the workspace. Please ensure that the proper dependencies are installed locally.`
      );
      throw 'local @nx/devkit dependency not found';
    }

    const nxVersion = await getNxVersion(workingPath);

    const importPath = join(devkitPath, 'src/executors/parse-target-string');
    const { parseTargetString } = await importWorkspaceDependency<
      typeof import('@nx/devkit/src/executors/parse-target-string')
    >(importPath, lspLogger);
    let parsedTarget: Target;
    if (gte(nxVersion.full, '17.0.6')) {
      // the nx console data structure to handle projects is not the same as ProjectGraph
      // we create a partial project graph to pass to the parseTargetString function
      // we only need a single project in it so we don't have to map over the entire workspace data
      // TODO: refactor nx console to use the ProjectGraph directly?
      const projectString = targetString.split(':')[0];
      const partialProjectGraph = {
        nodes: {
          [projectString]: {
            data: {
              targets: workspace.projects[projectString]?.targets,
            },
          },
        },
      } as ProjectGraph;
      parsedTarget = parseTargetString(targetString, partialProjectGraph);
    } else {
      parsedTarget = (parseTargetString as any)(targetString);
    }
    project = parsedTarget.project;
    target = parsedTarget.target;
    configuration = parsedTarget.configuration;
  } catch (e) {
    return;
  }

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

  const range =
    findLinkedTargetRange(document, jsonAst, target, configuration) ??
    findTargetsRange(document, jsonAst);

  if (!range) {
    return;
  }

  return URI.from({
    scheme: 'file',
    path: baseTargetProjectPath,
    fragment: `${range.start.line + 1}`,
  }).toString();
}

function findLinkedTargetRange(
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

function findTargetsRange(
  document: TextDocument,
  jsonAst: JSONDocument
): Range | undefined {
  if (!jsonAst.root) {
    return;
  }

  const targetNode = findProperty(jsonAst.root, 'targets');

  if (!targetNode) {
    return;
  }

  return createRange(document, targetNode);
}
