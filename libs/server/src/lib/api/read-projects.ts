import { Architect, Project, Schema } from '@angular-console/schema';
import { Store } from '@nrwl/angular-console-enterprise-electron';
import * as path from 'path';

import {
  getPrimitiveValue,
  normalizeSchema,
  readJsonFile
} from '../utils/utils';
import { readRecentActions } from './read-recent-actions';

export function readProjects(
  json: any,
  baseDir: string,
  store: Store
): Project[] {
  return Object.entries(json)
    .map(([key, value]: [string, any]) => {
      return {
        name: key,
        root: value.root,
        projectType: value.projectType,
        architect: readArchitect(key, value.architect),
        recentActions: readRecentActions(
          store,
          path.join(baseDir, value.root, key)
        )
      };
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

export function readBuilder(basedir: string, builder: string) {
  const [npmPackage, builderName] = builder.split(':');
  return readBuildersFile(basedir, npmPackage)[builderName];
}

export function readSchema(basedir: string, builder: string) {
  return readBuilder(basedir, builder).schema as Array<Schema>;
}

function readBuildersFile(basedir: string, npmPackage: string): any {
  const packageJson = readJsonFile(
    path.join(npmPackage, 'package.json'),
    path.join(basedir, 'node_modules')
  );
  const b = packageJson.json.builders;
  const buildersPath = b.startsWith('.') ? b : `./${b}`;
  const buildersJson = readJsonFile(
    buildersPath,
    path.dirname(packageJson.path)
  );

  const builders = {} as any;
  Object.entries(buildersJson.json.builders).forEach(([k, v]: [any, any]) => {
    const builderSchema = readJsonFile(
      v.schema,
      path.dirname(buildersJson.path)
    );
    builders[k] = {
      name: k,
      schema: normalizeSchema(builderSchema.json),
      description: v.description || ''
    };
  });

  return builders;
}
