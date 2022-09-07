import type {
  NxJsonConfiguration,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import { toNewFormat } from 'nx/src/config/workspaces';

export function getPrimitiveValue(value: any): string | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value.toString();
  } else {
    return undefined;
  }
}

export function toWorkspaceFormat(
  w: any
): WorkspaceJsonConfiguration & NxJsonConfiguration {
  const newFormat = toNewFormat(w) as WorkspaceJsonConfiguration &
    NxJsonConfiguration;
  const sortedProjects = Object.entries(newFormat.projects || {}).sort(
    (projectA, projectB) => projectA[0].localeCompare(projectB[0])
  );
  newFormat.projects = Object.fromEntries(sortedProjects);
  return newFormat;
}

export function hasKey<T>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}
