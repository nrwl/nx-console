import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { SchemaProcessor } from '../nx-console-plugin-types';
import { NxWorkspace } from '@nx-console/shared/types';

export const useGeneratorDefaultsProcessor: SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  const nxJsonGeneratorsEntry =
    workspace.workspace?.generators?.[schema.collectionName]?.[
      schema.generatorName
    ] ??
    workspace.workspace?.generators?.[
      `${schema.collectionName}:${schema.generatorName}`
    ];

  if (!nxJsonGeneratorsEntry) {
    return schema;
  }

  return {
    ...schema,
    options: (schema.options ?? []).map((option) => {
      if (nxJsonGeneratorsEntry[option.name]) {
        option.default = nxJsonGeneratorsEntry[option.name];
      }
      return option;
    }),
  };
};
