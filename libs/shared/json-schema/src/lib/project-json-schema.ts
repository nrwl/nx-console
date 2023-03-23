import { TargetConfiguration } from 'nx/src/devkit-exports';
import { CollectionInfo } from '@nx-console/shared/schema';
import { TargetDefaults } from 'nx/src/config/nx-json';
import type { JSONSchema } from 'vscode-json-languageservice';
import {
  implicitDependencies,
  namedInputs,
  tags,
  targets,
} from './common-json-schema';
import { CompletionType, EnhancedJsonSchema } from './completion-type';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';

type JSONSchemaMap = NonNullable<JSONSchema['properties']>;

export function getProjectJsonSchema(
  collections: CollectionInfo[],
  targetDefaults: TargetDefaults = {}
) {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(executors, targetDefaults);
  return contents;
}

function createJsonSchema(
  executors: JSONSchema[],
  targetDefaults: TargetDefaults
): EnhancedJsonSchema {
  const targetsSchema =
    (targets(executors).additionalProperties as object) ?? {};
  const targetsProperties = Object.keys(targetDefaults).reduce<JSONSchemaMap>(
    (targets, target) => {
      const defaults: Partial<TargetConfiguration> = targetDefaults[target];
      let targetSchema: JSONSchema = targetsSchema;
      if (defaults?.executor) {
        const match = executors.find((schema) => {
          const test = schema.if as JSONSchema;
          const executor = test?.properties?.executor as JSONSchema;
          return executor?.const === defaults.executor;
        });
        if (match) {
          targetSchema = {
            if: {
              properties: { executor: { type: 'string' } },
              required: ['executor'],
            },
            then: targetsSchema,
            else: match.then,
          };
        }
      }
      targets[target] = targetSchema;
      return targets;
    },
    {}
  );
  return {
    type: 'object',
    properties: {
      sourceRoot: {
        type: 'string',
        'x-completion-type': CompletionType.directory,
      },
      implicitDependencies,
      tags,
      namedInputs,
      targets: {
        type: 'object',
        properties: targetsProperties,
        additionalProperties: targetsSchema,
      },
    },
  };
}
