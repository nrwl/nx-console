import {
  CompletionType,
  hasCompletionGlob,
  hasCompletionType,
  X_COMPLETION_GLOB,
  X_COMPLETION_TYPE,
} from '@nx-console/shared/json-schema';
import {
  getDefaultCompletionType,
  isArrayNode,
  lspLogger,
} from '@nx-console/language-server/utils';
import {
  ASTNode,
  CompletionItem,
  JSONDocument,
  MatchingSchema,
  Position,
  TextDocument,
} from 'vscode-json-languageservice';
import { inputNameCompletion } from './input-name-completion';
import { pathCompletion } from './path-completion';
import { projectCompletion } from './project-completion';
import { projectTargetCompletion } from './project-target-completion';
import { tagsCompletion } from './tags-completion';
import { targetsCompletion } from './targets-completion';
import { NxVersion } from '@nx-console/shared/types';
import { Logger } from '@nx-console/shared/schema';
import { inferencePluginsCompletion } from './inference-plugins-completion';

export async function getCompletionItems(
  workingPath: string | undefined,
  nxVersion: NxVersion,
  jsonAst: JSONDocument,
  document: TextDocument,
  schemas: MatchingSchema[],
  position: Position,
  lspLogger?: Logger
): Promise<CompletionItem[]> {
  if (!workingPath) {
    return [];
  }

  const offset = document.offsetAt(position);
  const node = jsonAst.getNodeFromOffset(offset);
  if (!node) {
    return [];
  }

  const items = completionItems(workingPath, nxVersion, node, document);

  let resolvedItems: CompletionItem[] = [];

  for (const { schema, node: schemaNode } of schemas) {
    // Find the schema node that matches the current node
    // If the node is found, then we will return the whole function so that we don't have to loop over the rest of the items.
    if (schemaNode == node) {
      if (hasCompletionType(schema)) {
        const completion = schema[X_COMPLETION_TYPE];
        if (hasCompletionGlob(schema)) {
          resolvedItems = await items(completion, schema[X_COMPLETION_GLOB]);
          break;
        }

        resolvedItems = await items(completion);
        break;
      }
    }
  }

  const defaultCompletion = getDefaultCompletionType(node);

  if (defaultCompletion && resolvedItems.length === 0) {
    resolvedItems = await items(
      defaultCompletion.completionType,
      defaultCompletion.glob
    );
  }

  // remove duplicate values from the resolved completed items
  if (isArrayNode(node.parent)) {
    const existingItems = node.parent.children.map((i) =>
      JSON.stringify(i.value)
    );
    resolvedItems = resolvedItems.filter(
      (resolvedItem) => !existingItems.includes(resolvedItem.label)
    );
  }

  return resolvedItems;
}

function completionItems(
  workingPath: string,
  nxVersion: NxVersion,
  node: ASTNode,
  document: TextDocument
) {
  return async (
    completion: CompletionType,
    glob?: string
  ): Promise<CompletionItem[]> => {
    // const supportsInterpolation = nxVersion.major >= 16;
    // todo(jcammisuli): change this once executors support {workspaceRoot} and {projectRoot} in their options
    const supportsInterpolation = false;
    switch (completion) {
      case CompletionType.file: {
        return pathCompletion(workingPath, node, document, {
          glob: glob ?? '*.*',
          searchType: 'file',
          supportsInterpolation,
        });
      }
      case CompletionType.directory: {
        return pathCompletion(workingPath, node, document, {
          glob: glob ?? '*',
          searchType: 'directory',
          supportsInterpolation,
        });
      }
      case CompletionType.projectTarget: {
        return projectTargetCompletion(workingPath, node, document);
      }
      case CompletionType.projects: {
        return projectCompletion(workingPath, node, document);
      }
      case CompletionType.tags: {
        return tagsCompletion(workingPath, node, document);
      }
      case CompletionType.targets: {
        return targetsCompletion(workingPath, node, document);
      }
      case CompletionType.targetsWithDeps: {
        return targetsCompletion(workingPath, node, document, true);
      }
      case CompletionType.inputName: {
        return inputNameCompletion(workingPath, node, document);
      }
      case CompletionType.inputNameWithDeps: {
        return inputNameCompletion(workingPath, node, document, true);
      }
      case CompletionType.inferencePlugins: {
        return inferencePluginsCompletion(workingPath);
      }
      default: {
        return [];
      }
    }
  };
}
