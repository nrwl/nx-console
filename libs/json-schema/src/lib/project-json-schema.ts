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
    title: 'JSON schema for Nx projects',
    id: 'https://nx.dev/project-schema',
    type: 'object',
    properties: {
      targets: {
        description:
          'Configures all the targets which define what tasks you can run against the project',
        additionalProperties: {
          type: 'object',
          properties: {
            executor: {
              description:
                'The function that Nx will invoke when you run this target',
              type: 'string',
            },
            configurations: {
              description:
                'provides extra sets of values that will be merged into the options map',
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
