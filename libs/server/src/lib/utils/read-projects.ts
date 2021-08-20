import {
  Targets,
  Project,
  Option,
  DefaultValue,
  TargetConfiguration,
} from '@nx-console/schema';
import * as path from 'path';
import { TargetConfiguration as NxTargetConfiguration } from '@nrwl/devkit';

import {
  getPrimitiveValue,
  normalizeSchema,
  readAndCacheJsonFile,
} from '../utils/utils';

export function readTargetDef(
  targetName: string,
  targetsDef: NxTargetConfiguration,
  project: string
): Targets {
  const configurations: TargetConfiguration[] = targetsDef.configurations
    ? Object.keys(targetsDef.configurations).map((name) => ({
        name,
        defaultValues: readDefaultValues(targetsDef.configurations, name),
      }))
    : [];

  return {
    options: [],
    configurations,
    name: targetName,
    project,
    description: (targetsDef as any).description ?? '',
    builder: targetsDef.executor,
  };
}

export function readTargets(project: string, targets: any): Targets[] {
  if (!targets) return [];
  return Object.entries(targets).map(([key, value]: [string, any]) => {
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
  builder: string,
  projectDefaults?: { [name: string]: string }
): Promise<Option[]> {
  const [npmPackage, builderName] = builder.split(':');
  const packageJson = readAndCacheJsonFile(
    path.join(npmPackage, 'package.json'),
    path.join(basedir, 'node_modules')
  );
  const b = packageJson.json.builders || packageJson.json.executors;
  const buildersPath = b.startsWith('.') ? b : `./${b}`;
  const buildersJson = readAndCacheJsonFile(
    buildersPath,
    path.dirname(packageJson.path)
  );

  const builderDef = (buildersJson.json.builders ||
    buildersJson.json.executors)[builderName];
  const builderSchema = readAndCacheJsonFile(
    builderDef.schema,
    path.dirname(buildersJson.path)
  );

  return await normalizeSchema(builderSchema.json, projectDefaults);
}
