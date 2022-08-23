import { CollectionInfo } from '@nx-console/schema';
import type { JSONSchema } from 'vscode-json-languageservice';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';
import {
  CompletionType,
  X_COMPLETION_GLOB,
  X_COMPLETION_TYPE,
} from './completion-type';

export function getProjectJsonSchema(collections: CollectionInfo[]) {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(executors);
  return contents;
}

interface EnhancedJsonSchema extends JSONSchema {
  [X_COMPLETION_TYPE]?: CompletionType;
  [X_COMPLETION_GLOB]?: string;
}

function createJsonSchema(executors: JSONSchema[]): EnhancedJsonSchema {
  return {
    type: 'object',
    properties: {
      root: {
        type: 'string',
        'x-completion-type': 'directory',
      } as EnhancedJsonSchema,
      sourceRoot: {
        type: 'string',
        'x-completion-type': 'directory',
      } as EnhancedJsonSchema,
      targets: {
        additionalProperties: {
          type: 'object',
          properties: {
            outputs: {
              type: 'array',
              items: {
                type: 'string',
                'x-completion-type': 'directory',
              } as EnhancedJsonSchema,
            },
            executor: {
              type: 'string',
            },
            configurations: {
              additionalProperties: {
                type: 'object',
              },
            },
          },
          allOf: executors,
        },
      },
    },
  };
}
