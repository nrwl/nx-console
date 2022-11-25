import type { ProjectConfiguration } from '@nrwl/devkit';
import { JSONSchemaMap } from 'vscode-json-languageservice/lib/umd/jsonSchema';

import { targets } from './common-json-schema';
import { CompletionType, EnhancedJsonSchema } from './completion-type';

export function getNxJsonSchema(
  projects: Record<string, ProjectConfiguration>
) {
  const targets = getTargets(projects);
  const contents = createJsonSchema(targets);
  return contents;
}

function createJsonSchema(projectTargets: string[]): EnhancedJsonSchema {
  const targetsSchema = (targets().additionalProperties as object) ?? {};
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
