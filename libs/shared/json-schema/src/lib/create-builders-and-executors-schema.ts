import { CollectionInfo } from '@nx-console/shared/schema';
import { JSONSchema } from 'vscode-json-languageservice';

type BuildersSchema = JSONSchema;
type ExecutorsSchema = JSONSchema;

/**
 * Builds the schema for builders and executors.
 *
 * @param collections
 * @returns [BuildersSchema[], ExecutorsSchema[]]
 */
export function createBuildersAndExecutorsSchema(
  collections: CollectionInfo[]
): [BuildersSchema[], ExecutorsSchema[]] {
  return collections.reduce<[BuildersSchema[], ExecutorsSchema[]]>(
    (acc, collection) => {
      acc[0].push({
        if: {
          properties: { builder: { const: collection.name } },
          required: ['builder'],
        },
        then: {
          properties: {
            options: {
              $ref: `file://${collection.path}`,
            },
            configurations: {
              additionalProperties: {
                $ref: `file://${collection.path}`,
                required: [],
              },
            },
          },
        },
      });
      acc[1].push({
        if: {
          properties: { executor: { const: collection.name } },
          required: ['executor'],
        },
        then: {
          properties: {
            options: {
              $ref: `file://${collection.path}`,
            },
            configurations: {
              additionalProperties: {
                $ref: `file://${collection.path}`,
                required: [],
              },
            },
          },
        },
      });
      return acc;
    },
    [[], []]
  );
}
