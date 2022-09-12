import {
  Targets,
  Option,
  DefaultValue,
  TargetConfiguration,
  WorkspaceProjects,
} from '@nx-console/shared/schema';
import * as path from 'path';
import { TargetConfiguration as NxTargetConfiguration } from '@nrwl/devkit';

import { getTelemetry } from './telemetry';
import { getOutputChannel } from './output-channel';
import {
  localDependencyPath,
  workspaceDependencyPath,
} from '@nx-console/shared/npm';
import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { normalizeSchema } from '@nx-console/shared/schema/normalize';
import { getPrimitiveValue } from '@nx-console/shared/utils';

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
  workspaceType: 'ng' | 'nx',
  projects: WorkspaceProjects,
  projectDefaults?: { [name: string]: string }
): Promise<Option[] | undefined> {
  try {
    const [packageName, builderName] = builder.split(':');
    let packagePath = await workspaceDependencyPath(basedir, packageName);

    if (!packagePath) {
      packagePath = await localDependencyPath(basedir, packageName, projects);
    }

    if (!packagePath) {
      return undefined;
    }

    const packageJson = await readAndCacheJsonFile(
      path.join(packagePath, 'package.json')
    );
    const b = packageJson.json.builders || packageJson.json.executors;
    const buildersPath = b.startsWith('.') ? b : `./${b}`;
    const buildersJson = await readAndCacheJsonFile(
      buildersPath,
      path.dirname(packageJson.path)
    );

    const builderDef = {
      ...buildersJson.json.builders,
      ...buildersJson.json.executors,
    }[builderName];
    const builderSchema = await readAndCacheJsonFile(
      builderDef.schema,
      path.dirname(buildersJson.path)
    );

    return await normalizeSchema(
      builderSchema.json,
      workspaceType,
      projectDefaults
    );
  } catch (e) {
    // todo: make this a utility function to be used in more places.
    const stringifiedError = e.toString ? e.toString() : JSON.stringify(e);
    getOutputChannel().appendLine(stringifiedError);
    getTelemetry().exception(stringifiedError);
  }
}
