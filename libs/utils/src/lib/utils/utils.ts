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
<<<<<<< HEAD

function schemaToOptions(
  schema: Schema,
  config?: { hyphenate: boolean }
): CliOption[] {
  return Object.keys(schema.properties || {}).reduce<CliOption[]>(
    (cliOptions, option) => {
      const currentProperty = schema.properties[option];
      const $default = currentProperty.$default;
      const $defaultIndex =
        $default?.['$source'] === 'argv' ? $default['index'] : undefined;
      const positional: number | undefined =
        typeof $defaultIndex === 'number' ? $defaultIndex : undefined;

      const visible = isPropertyVisible(option, currentProperty);
      if (!visible) {
        return cliOptions;
      }
      const name = config?.hyphenate ? names(option).fileName : option;
      cliOptions.push({
        name,
        originalName: option,
        positional,
        ...currentProperty,
      });
      return cliOptions;
    },
    []
  );
}

function isPropertyVisible(
  option: string,
  property: OptionPropertyDescription
): boolean {
  const ALWAYS_VISIBLE_OPTIONS = ['path'];

  if (ALWAYS_VISIBLE_OPTIONS.includes(option)) {
    return true;
  }

  if ('hidden' in property) {
    return !(property as any)['hidden'];
  }

  return property.visible ?? true;
}
||||||| parent of e300db5 (refactor packages to remove dependencies on vscode)

function schemaToOptions(
  schema: Schema,
  config?: { hyphenate: boolean }
): CliOption[] {
  return Object.keys(schema.properties || {}).reduce<CliOption[]>(
    (cliOptions, option) => {
      const currentProperty = schema.properties[option];
      const $default = currentProperty.$default;
      const $defaultIndex =
        $default?.['$source'] === 'argv' ? $default['index'] : undefined;
      const positional: number | undefined =
        typeof $defaultIndex === 'number' ? $defaultIndex : undefined;

      const visible = isPropertyVisible(option, currentProperty);
      if (!visible) {
        return cliOptions;
      }
      const name = config?.hyphenate ? names(option).fileName : option;
      cliOptions.push({
        name,
        originalName: option,
        positional,
        ...currentProperty,
      });
      return cliOptions;
    },
    []
  );
}

function isPropertyVisible(
  option: string,
  property: OptionPropertyDescription
): boolean {
  const ALWAYS_VISIBLE_OPTIONS = ['path'];

  if (ALWAYS_VISIBLE_OPTIONS.includes(option)) {
    return true;
  }

  if ('hidden' in property) {
    return !(property as any)['hidden'];
  }

  return property.visible ?? true;
}
