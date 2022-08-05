import { CollectionInfo } from '@nx-console/schema';
import { JSONSchema } from 'vscode-json-languageservice';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';

export function getProjectJsonSchema(collections: CollectionInfo[]) {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(executors);
  return contents;
}

function createJsonSchema(executors: JSONSchema[]): JSONSchema {
  return {
    type: 'object',
    properties: {
      targets: {
        additionalProperties: {
          type: 'object',
          properties: {
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
