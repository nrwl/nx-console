import { CollectionInfo } from '@nx-console/shared/schema';
import type { ProjectConfiguration } from '@nrwl/devkit';
import type { JSONSchema } from 'vscode-json-languageservice';
import { targets } from './common-json-schema';
import { CompletionType, EnhancedJsonSchema } from './completion-type';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';

type JSONSchemaMap = NonNullable<JSONSchema['properties']>;

export function getNxJsonSchema(
  collections: CollectionInfo[],
  projects: Record<string, ProjectConfiguration>
) {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const targets = getTargets(projects);
  const contents = createJsonSchema(executors, targets);
  return contents;
}

function createJsonSchema(
  executors: JSONSchema[],
  projectTargets: string[]
): EnhancedJsonSchema {
  const targetsSchema =
    (targets(executors).additionalProperties as object) ?? {};
  return {
    type: 'object',
    properties: {
      tasksRunnerOptions: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: {
                cacheableOperations: {
                  type: 'array',
                  items: {
                    type: 'string',
                    'x-completion-type': CompletionType.targets,
                  },
                },
              },
            },
          },
        },
      },
      targetDefaults: {
        type: 'object',
        properties: projectTargets.reduce<JSONSchemaMap>((acc, current) => {
          acc[current] = {
            type: 'object',
            ...targetsSchema,
          };
          return acc;
        }, {}),
      },
      targetDependencyConfig: {
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'string',
              'x-completion-type': CompletionType.targetsWithDeps,
            },
            {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                  description: 'The name of the target.',
                  'x-completion-type': CompletionType.targets,
                },
              },
            },
          ],
        },
      },
    },
  };
}

function getTargets(projects: Record<string, ProjectConfiguration>): string[] {
  const tags = new Set<string>();

  for (const projectConfiguration of Object.values(projects)) {
    for (const target of Object.keys(projectConfiguration.targets ?? {})) {
      tags.add(target);
    }
  }

  return Array.from(tags);
}
