import { Architect, Project, Schema } from '@angular-console/schema';
import * as path from 'path';

import {
  getPrimitiveValue,
  normalizeSchema,
  readAndCacheJsonFile
} from '../utils/utils';

export function readProjects(json: any): Project[] {
  return Object.entries(json)
    .map(([key, value]: [string, any]) => {
      return ({
        name: key,
        root: value.root,
        projectType: value.projectType,
        architect: readArchitect(key, value.architect)
      } as any) as Project;
    })
    .sort(compareProjects);
}

function compareProjects(a: Project, b: Project) {
  return a.root.localeCompare(b.root);
}

export function readArchitectDef(
  architectName: string,
  architectDef: any,
  project: string
): Architect {
  const options = {
    defaultValues: serializeDefaultsForConfig(architectDef.options)
  };
  const configurations = architectDef.configurations
    ? Object.keys(architectDef.configurations).map(name => ({
        name,
        defaultValues: readDefaultValues(
          architectDef.options,
          architectDef.configurations,
          name
        )
      }))
    : [];

  return {
    schema: [],
    options,
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

function readDefaultValues(options: any, configurations: any, name: string) {
  return serializeDefaultsForConfig({ ...options, ...configurations[name] });
}

function serializeDefaultsForConfig(config: any) {
  if (!config) return [];
  return Object.keys(config).reduce(
    (m, k) => [...m, { name: k, defaultValue: getPrimitiveValue(config[k]) }],
    [] as any[]
  );
}

export async function readBuilderSchema(
  basedir: string,
  builder: string
): Promise<Schema[] | undefined> {
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
