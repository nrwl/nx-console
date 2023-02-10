import type {
  NxJsonConfiguration,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import { toNewFormat } from 'nx/src/adapter/angular-json';

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

export function hasKey<T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T {
  return key in obj;
}

export function formatError(message: string, err: any): string {
  if (err instanceof Error) {
    const error = <Error>err;
    return `${message}: ${error.message}\n${error.stack}`;
  } else if (typeof err === 'string') {
    return `${message}: ${err}`;
  } else if (err) {
    return `${message}: ${err.toString()}`;
  }
  return message;
}

export function matchWithWildcards(
  text: string,
  expression: string,
  strict = true
) {
  const escapeRegex = (str: string) =>
    str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
  return new RegExp(
    `${strict ? '^' : ''}${expression.split('*').map(escapeRegex).join('.*')}$`
  ).test(text);
}
