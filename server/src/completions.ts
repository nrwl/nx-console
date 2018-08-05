import * as path from 'path';
import { normalizePath } from './utils';

export function completeFiles(
  files: { [path: string]: string[] },
  workspace: any,
  input: string
) {
  const path = workspace.path;
  if (!files[path]) return [];
  return files[path]
    .filter(f => f.indexOf(input) > -1)
    .map(value => value.substring(path.length + 1))
    .map(value => ({ value }));
}

export function completeProjects(workspace: any, input: string) {
  return workspace.projects
    .map((p: any) => p.name)
    .filter((p: string) => p.indexOf(input) > -1)
    .map((value: any) => ({ value }));
}

export function completeLocalModules(
  files: { [path: string]: string[] },
  workspace: any,
  input: string
) {
  const p = workspace.path;
  if (!files[p]) return [];
  return files[p]
    .filter(f => f.indexOf('module.ts') > -1)
    .filter(f => f.indexOf(input) > -1)
    .map(fullPath => {
      const modulePath = fullPath.substring(
        normalizePath(workspace.path).length + 1
      );
      let value;
      if (modulePath.indexOf(path.join('src', 'app')) > -1) {
        value = modulePath.substring(
          modulePath.indexOf(path.join('src', 'app')) + 8
        );
      } else {
        value = modulePath.substring(
          modulePath.indexOf(path.join('src', 'lib')) + 8
        );
      }
      return {
        value,
        display: modulePath
      };
    });
}

export function completeAbsoluteModules(
  files: { [path: string]: string[] },
  workspace: any,
  input: string
) {
  const path = workspace.path;
  if (!files[path]) return [];
  return files[path]
    .filter(f => f.indexOf('module.ts') > -1)
    .filter(f => f.indexOf(input) > -1)
    .map(fullPath => {
      const modulePath = fullPath.substring(
        normalizePath(workspace.path).length + 1
      );
      return {
        value: modulePath,
        display: modulePath
      };
    });
}
