import {
  Architect,
  Project,
  Option,
  DefaultValue,
  Target,
  TargetConfiguration
} from '@nx-console/schema';
import * as path from 'path';

import {
  getPrimitiveValue,
  normalizeSchema,
  readAndCacheJsonFile
} from '../utils/utils';

export function readProjects(json: any): Project[] {
  return Object.entries(json)
    .map(
      ([key, value]: [string, any]): Project => ({
        name: key,
        root: value.root,
        projectType: value.projectType,
        target: readTarget(key, {...value.architect, ...value.targets})
      })
    )
    .sort((a, b) => a.root.localeCompare(b.root));
}

export function readTargetDef(
  targetName: string,
  targetDef: any,
  project: string
): Architect | Target {
  const configurations: TargetConfiguration[] = targetDef.configurations
    ? Object.keys(targetDef.configurations).map(name => ({
        name,
        defaultValues: readDefaultValues(targetDef.configurations, name)
      }))
    : [];

  return {
    options: [],
    configurations,
    name: targetName,
    project,
    description: targetDef.description || '',
    builder: targetDef.builder
  };
}

export function readTarget(project: string, target: any): (Architect | Target)[] {
  if (!target) return [];
  return Object.entries(target).map(([key, value]: [string, any]) => {
    return readTargetDef(key, value, project);
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
  const b = packageJson.json.builders;
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
