import { CollectionInfo } from '@nx-console/schema';
import type { JSONSchema } from 'vscode-json-languageservice';
import {
  implicitDependencies,
  namedInputs,
  tags,
  targets,
} from './common-json-schema';
import { EnhancedJsonSchema } from './completion-type';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';

export function getProjectJsonSchema(collections: CollectionInfo[]) {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(executors);
  return contents;
}

function createJsonSchema(executors: JSONSchema[]): EnhancedJsonSchema {
  return {
    type: 'object',
    properties: {
      root: {
        type: 'string',
        'x-completion-type': 'directory',
      },
      sourceRoot: {
        type: 'string',
        'x-completion-type': 'directory',
      },
      implicitDependencies,
      tags,
      namedInputs,
      targets: targets(executors),
    },
  };
}
