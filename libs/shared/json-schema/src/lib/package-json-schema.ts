import { NxVersion } from '@nx-console/shared/types';
import {
  implicitDependencies,
  namedInputs,
  tags,
  targets,
} from './common-json-schema';
import { EnhancedJsonSchema } from './completion-type';

export function getPackageJsonSchema(nxVersion: NxVersion) {
  const contents = createJsonSchema(nxVersion);
  return contents;
}

function createJsonSchema(nxVersion: NxVersion): EnhancedJsonSchema {
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
          targets: targets(nxVersion),
        },
      },
    },
  };
}
