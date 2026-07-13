import { CollectionInfo } from '@nx-console/shared-schema';
import type { TargetDefaults } from 'nx/src/config/nx-json';
import type { JSONSchema } from 'vscode-json-languageservice';
import {
  implicitDependencies,
  namedInputs,
  tags,
  targets,
} from './common-json-schema';
import { CompletionType, EnhancedJsonSchema } from './completion-type';
import { createBuildersAndExecutorsSchema } from './create-builders-and-executors-schema';
import { NxVersion } from '@nx-console/nx-version';

type JSONSchemaMap = NonNullable<JSONSchema['properties']>;

export function getProjectJsonSchema(
  collections: CollectionInfo[],
  targetDefaults: TargetDefaults = {},
  nxVersion: NxVersion,
) {
  const [, executors] = createBuildersAndExecutorsSchema(collections);
  const contents = createJsonSchema(executors, targetDefaults, nxVersion);
  return contents;
}

function createJsonSchema(
  executors: JSONSchema[],
  targetDefaults: TargetDefaults,
  nxVersion: NxVersion,
): EnhancedJsonSchema {
  const targetsSchema =
    (targets(nxVersion, executors).additionalProperties as object) ?? {};
  const targetsProperties = Object.keys(targetDefaults)
    .filter(
      (target) =>
        !(
          target.includes('@') &&
          target.includes('/') &&
          target.includes(':')
        ) &&
        target !== 'nx:run-commands' &&
        target !== 'nx:run-script' &&
        target !== 'nx:noop',
    )
    .reduce<JSONSchemaMap>((targets, target) => {
      const defaults = targetDefaults[target];
      // Array-form targetDefaults entries apply in document order with the
      // last match winning, so take the executor from the last entry that
      // sets one.
      const defaultExecutor: string | undefined = Array.isArray(defaults)
        ? defaults.filter((entry) => entry.executor).pop()?.executor
        : defaults?.executor;
      let targetSchema: JSONSchema = targetsSchema;
      if (defaultExecutor) {
        const match = executors.find((schema) => {
          const test = schema.if as JSONSchema;
          const executor = test?.properties?.executor as JSONSchema;
          return executor?.const === defaultExecutor;
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
    }, {});
  return {
    type: 'object',
    properties: {
      sourceRoot: {
        type: 'string',
        'x-completion-type': CompletionType.directory,
      },
      implicitDependencies,
      tags,
      namedInputs: namedInputs(nxVersion),
      targets: {
        type: 'object',
        properties: targetsProperties,
        additionalProperties: targetsSchema,
      },
    },
  };
}
