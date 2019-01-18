import { normalizeSchema, readJsonFile } from '../utils/utils';
import { Project, Architect } from '../generated/graphql-types';
import * as path from 'path';

export function readProjects(basedir: string, json: any): Project[] {
  return Object.entries(json)
    .map(([key, value]: [string, any]) => {
      return {
        name: key,
        root: value.root,
        projectType: value.projectType,
        architect: readArchitect(key, basedir, value.architect)
      };
    })
    .sort(compareProjects);
}

function compareProjects(a: Project, b: Project) {
  return a.root.localeCompare(b.root);
}

function readArchitect(
  project: string,
  basedir: string,
  architect: any
): Architect[] {
  if (!architect) return [];
  return Object.entries(architect).map(([key, value]: [string, any]) => {
    const configurations = value.configurations
      ? Object.keys(value.configurations).map(name => ({ name }))
      : [];
    return {
      schema: [],
      configurations,
      name: key,
      project,
      builder: value.builder
    };
  });
}

export function readSchema(basedir: string, builder: string) {
  const [npmPackage, builderName] = builder.split(':');
  return readBuildersFile(basedir, npmPackage)[builderName].schema;
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
      description: v.description
    };
  });

  return builders;
}
