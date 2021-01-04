import {
  Architect,
  Project,
  Option,
  DefaultValue,
  ArchitectConfiguration
} from '@nx-console/schema';
import * as path from 'path';

import {
  getPrimitiveValue,
  normalizeSchema,
  readAndCacheJsonFile,
  toLegacyFormat
} from '../utils/utils';

export function readProjects(json: any): Project[] {
  return Object.entries(json)
    .map(
      ([key, value]: [string, any]): Project => ({
        name: key,
        root: value.root,
        projectType: value.projectType,
        architect: readArchitect(key, value.architect)
      })
    )
    .sort((a, b) => a.root.localeCompare(b.root));
}

export function readArchitectDef(
  architectName: string,
  architectDef: any,
  project: string
): Architect {
  const configurations: ArchitectConfiguration[] = architectDef.configurations
    ? Object.keys(architectDef.configurations).map(name => ({
        name,
        defaultValues: readDefaultValues(architectDef.configurations, name)
      }))
    : [];

  return {
    options: [],
    configurations,
    name: architectName,
    project,
    description: architectDef.description || '',
    builder: architectDef.builder
  };
}

export function readArchitect(project: string, architect: any): Architect[] {
  if (!architect) return [];
  return Object.entries(architect).map(([key, value]: [string, any]) => {
    return readArchitectDef(key, value, project);
  });
}

function readDefaultValues(configurations: any, name: string): DefaultValue[] {
  const defaults: DefaultValue[] = [];
  const config = configurations[name];
  if (!config) return defaults;
  return Object.keys(config).reduce(
    (m, k) => [...m, { name: k, defaultValue: getPrimitiveValue(config[k]) }],
    defaults
  );
}

export async function readBuilderSchema(
  basedir: string,
  builder: string
): Promise<Option[]> {
  const [npmPackage, builderName] = builder.split(':');
  const packageJson = readAndCacheJsonFile(
    path.join(npmPackage, 'package.json'),
    path.join(basedir, 'node_modules')
  );
  const b = toLegacyFormat(packageJson.json).builders;
  const buildersPath = b.startsWith('.') ? b : `./${b}`;
  const buildersJson = readAndCacheJsonFile(
    buildersPath,
    path.dirname(packageJson.path)
  );

  const builderDef = buildersJson.json.builders[builderName];
  const builderSchema = readAndCacheJsonFile(
    builderDef.schema,
    path.dirname(buildersJson.path)
  );

  return await normalizeSchema(builderSchema.json);
}
