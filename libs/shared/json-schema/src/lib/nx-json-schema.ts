import { CollectionInfo } from '@nx-console/shared-schema';
import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import type { JSONSchema } from 'vscode-json-languageservice';
import { namedInputs, targets } from './common-json-schema';
import { CompletionType } from './completion-type';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';
import { NxVersion } from '@nx-console/nx-version';
import { workspaceDependencyPath } from '@nx-console/shared-npm';
import { join } from 'path';
import { readFileSync } from 'fs';

type JSONSchemaMap = NonNullable<JSONSchema['properties']>;

export async function getNxJsonSchema(
  collections: CollectionInfo[],
  projects: Record<string, ProjectGraphProjectNode>,
  nxVersion: NxVersion,
  workspacePath: string
): Promise<JSONSchema> {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const targets = getTargets(projects);
  const contents = createJsonSchema(executors, targets, nxVersion);
  const staticNxJsonSchema = await getStaticNxJsonSchema(workspacePath);
  if (!staticNxJsonSchema) {
    return contents;
  }
  return {
    allOf: [contents, staticNxJsonSchema],
  };
}

function createJsonSchema(
  executors: JSONSchema[],
  projectTargets: string[],
  nxVersion: NxVersion
): JSONSchema {
  const targetsSchema =
    (targets(nxVersion, executors).additionalProperties as object) ?? {};
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
      plugins: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            plugin: {
              type: 'string',
              'x-completion-type': CompletionType.inferencePlugins,
            },
          },
        },
      },
      namedInputs: namedInputs(nxVersion),
    },
  };
}

function getTargets(
  projects: Record<string, ProjectGraphProjectNode>
): string[] {
  const tags = new Set<string>();

  for (const projectConfiguration of Object.values(projects)) {
    for (const target of Object.keys(projectConfiguration.data.targets ?? {})) {
      tags.add(target);
    }
  }

  return Array.from(tags);
}

export async function getStaticNxJsonSchema(workspacePath: string) {
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath) {
    return;
  }
  try {
    const schema = readFileSync(join(nxPath, 'schemas', 'nx-schema.json'));
    const parsedSchema = JSON.parse(schema.toString());
    return parsedSchema;
  } catch (e) {
    return;
  }
}
