import {
  implicitDependencies,
  namedInputs,
  tags,
  targets,
} from './common-json-schema';
import { EnhancedJsonSchema } from './completion-type';

export function getPackageJsonSchema() {
  const contents = createJsonSchema();
  return contents;
}

function createJsonSchema(): EnhancedJsonSchema {
  return {
    type: 'object',
    properties: {
      nx: {
        type: 'object',
        properties: {
          ignore: {
            type: 'boolean',
          },
          namedInputs,
          tags,
          implicitDependencies,
          targets: targets(),
        },
      },
    },
  };
}
