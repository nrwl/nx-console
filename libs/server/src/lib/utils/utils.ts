import { Schema } from '@nrwl/tao/src/shared/params';
import * as path from 'path';
import type {
  WorkspaceJsonConfiguration,
  NxJsonConfiguration,
} from '@nrwl/devkit';

import {
  ItemsWithEnum,
  ItemTooltips,
  LongFormXPrompt,
  Option,
  OptionItemLabelValue,
  XPrompt,
  CliOption,
  OptionPropertyDescription,
} from '@nx-console/schema';

import { readdirSync, statSync } from 'fs';
import { readFile, stat } from 'fs/promises';
import {
  parse as parseJson,
  ParseError,
  printParseErrorCode,
} from 'jsonc-parser';
import { readdir } from 'fs/promises';
import { getOutputChannel } from './output-channel';
import { toNewFormat } from '@nrwl/tao/src/shared/workspace';

export interface GeneratorDefaults {
  [name: string]: string;
}

export const files: { [path: string]: string[] } = {};
export const fileContents: { [path: string]: any } = {};

const IMPORTANT_FIELD_NAMES = [
  'name',
  'project',
  'module',
  'watch',
  'style',
  'directory',
  'port',
];
const IMPORTANT_FIELDS_SET = new Set(IMPORTANT_FIELD_NAMES);

/**
 * Get a flat list of all node_modules folders in the workspace.
 * This is needed to continue to support Angular CLI projects.
 *
 * @param nodeModulesDir
 * @returns
 */
export async function listOfUnnestedNpmPackages(
  nodeModulesDir: string
): Promise<string[]> {
  const res: string[] = [];
  const stats = await stat(nodeModulesDir);
  if (!stats.isDirectory()) {
    return res;
  }

  const dirContents = await readdir(nodeModulesDir);

  for (const npmPackageOrScope of dirContents) {
    if (npmPackageOrScope.startsWith('.')) {
      continue;
    }

    const packageStats = await stat(
      path.join(nodeModulesDir, npmPackageOrScope)
    );
    if (!packageStats.isDirectory()) {
      continue;
    }

    if (npmPackageOrScope.startsWith('@')) {
      (await readdir(path.join(nodeModulesDir, npmPackageOrScope))).forEach(
        (p) => {
          res.push(`${npmPackageOrScope}/${p}`);
        }
      );
    } else {
      res.push(npmPackageOrScope);
    }
  }

  return res;
}

export function listFiles(dirName: string): string[] {
  // TODO use .gitignore to skip files
  if (dirName.indexOf('node_modules') > -1) return [];
  if (dirName.indexOf('dist') > -1) return [];

  const res = [dirName];
  // the try-catch here is intentional. It's only used in auto-completion.
  // If it doesn't work, we don't want the process to exit
  try {
    readdirSync(dirName).forEach((c) => {
      const child = path.join(dirName, c);
      try {
        if (!statSync(child).isDirectory()) {
          res.push(child);
        } else if (statSync(child).isDirectory()) {
          res.push(...listFiles(child));
        }
      } catch {
        // noop
      }
    });
  } catch {
    // noop
  }
  return res;
}

export async function directoryExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function readAndParseJson(filePath: string) {
  const content = await readFile(filePath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    const errors: ParseError[] = [];
    const result = parseJson(content, errors);

    if (errors.length > 0) {
      for (const { error, offset } of errors) {
        getOutputChannel().appendLine(
          `${printParseErrorCode(
            error
          )} in JSON at position ${offset} in ${filePath}`
        );
      }
    }

    return result;
  }
}

export function clearJsonCache(filePath: string, basedir = '') {
  const fullFilePath = path.join(basedir, filePath);
  return delete fileContents[fullFilePath];
}

/**
 * Caches already created json contents to a file path
 */
export function cacheJson(filePath: string, basedir = '', content?: any) {
  const fullFilePath = path.join(basedir, filePath);
  if (fileContents[fullFilePath]) {
    return {
      json: fileContents[fullFilePath],
      path: fullFilePath,
    };
  }

  if (content) {
    fileContents[fullFilePath] = content;
  }
  return {
    json: content,
    path: fullFilePath,
  };
}

export async function readAndCacheJsonFile(
  filePath: string | undefined,
  basedir = ''
): Promise<{ path: string; json: any }> {
  if (!filePath) {
    return {
      path: '',
      json: {},
    };
  }
  const fullFilePath = path.join(basedir, filePath);
  try {
    const stats = await stat(fullFilePath);
    if (fileContents[fullFilePath] || stats.isFile()) {
      fileContents[fullFilePath] ||= await readAndParseJson(fullFilePath);
      return {
        path: fullFilePath,
        json: fileContents[fullFilePath],
      };
    }
  } catch (e) {
    getOutputChannel().appendLine(`${fullFilePath} does not exist`);
  }

  return {
    path: fullFilePath,
    json: {},
  };
}

export async function normalizeSchema(
  s: Schema,
  projectDefaults?: GeneratorDefaults
): Promise<Option[]> {
  const options = schemaToOptions(s);
  const requiredFields = new Set(s.required || []);

  const nxOptions = options.map((option) => {
    const xPrompt: XPrompt | undefined = option['x-prompt'];
    const workspaceDefault = projectDefaults && projectDefaults[option.name];
    const $default = option.$default;

    const nxOption: Option = {
      ...option,
      isRequired: isFieldRequired(requiredFields, option, xPrompt, $default),
      aliases: option.alias ? [option.alias] : [],
      ...(workspaceDefault !== undefined && { default: workspaceDefault }),
      ...($default && { $default }),
      ...(option.enum && { items: option.enum.map((item) => item.toString()) }),
      // Strongly suspect items does not belong in the Option schema.
      //  Angular Option doesn't have the items property outside of x-prompt,
      //  but items is used in @schematics/angular - guard
      ...getItems(option),
    };

    if (xPrompt) {
      nxOption.tooltip = isLongFormXPrompt(xPrompt) ? xPrompt.message : xPrompt;
      nxOption.itemTooltips = getEnumTooltips(xPrompt);
      if (isLongFormXPrompt(xPrompt) && !nxOption.items) {
        const items = (xPrompt.items || []).map((item) =>
          isOptionItemLabelValue(item) ? item.value : item
        );
        if (items.length > 0) {
          nxOption.items = items;
        }
      }
    }

    return nxOption;
  });

  return nxOptions.sort((a, b) => {
    if (typeof a.positional === 'number' && typeof b.positional === 'number') {
      return a.positional - b.positional;
    }

    if (typeof a.positional === 'number') {
      return -1;
    } else if (typeof b.positional === 'number') {
      return 1;
    } else if (a.required) {
      if (b.required) {
        return a.name.localeCompare(b.name);
      }
      return -1;
    } else if (b.required) {
      return 1;
    } else if (IMPORTANT_FIELDS_SET.has(a.name)) {
      if (IMPORTANT_FIELDS_SET.has(b.name)) {
        return (
          IMPORTANT_FIELD_NAMES.indexOf(a.name) -
          IMPORTANT_FIELD_NAMES.indexOf(b.name)
        );
      }
      return -1;
    } else if (IMPORTANT_FIELDS_SET.has(b.name)) {
      return 1;
    } else {
      return a.name.localeCompare(b.name);
    }
  });
}

function isFieldRequired(
  requiredFields: Set<string>,
  nxOption: CliOption,
  xPrompt: XPrompt | undefined,
  $default: any
): boolean {
  // checks schema.json requiredFields and xPrompt for required
  return (
    requiredFields.has(nxOption.name) ||
    // makes xPrompt fields required so nx command can run with --no-interactive
    // - except properties with a default (also falsey, empty, null)
    // - except properties with a $default $source
    // - except boolean properties (should also have default of `true`)
    (!!xPrompt && !nxOption.default && !$default && nxOption.type !== 'boolean')
  );
}

function getItems(option: CliOption): { items: string[] } | undefined {
  return (
    option.items && {
      items:
        (option.items as ItemsWithEnum).enum ||
        ((option.items as string[]).length && option.items),
    }
  );
}

function isLongFormXPrompt(xPrompt: XPrompt): xPrompt is LongFormXPrompt {
  return (xPrompt as Partial<LongFormXPrompt>).message !== undefined;
}

function getEnumTooltips(xPrompt: XPrompt): ItemTooltips {
  const enumTooltips: ItemTooltips = {};
  if (!!xPrompt && isLongFormXPrompt(xPrompt)) {
    (xPrompt.items || []).forEach((item) => {
      if (isOptionItemLabelValue(item) && !!item.label) {
        enumTooltips[item.value] = item.label;
      }
    });
  }
  return enumTooltips;
}

function isOptionItemLabelValue(
  item: string | OptionItemLabelValue
): item is OptionItemLabelValue {
  return (
    (item as Partial<OptionItemLabelValue>).value !== undefined ||
    (item as Partial<OptionItemLabelValue>).label !== undefined
  );
}

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

function schemaToOptions(schema: Schema): CliOption[] {
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

      cliOptions.push({
        name: option,
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
