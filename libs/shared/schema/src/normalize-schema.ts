import {
  CliOption,
  ItemsWithEnum,
  ItemTooltips,
  LongFormXPrompt,
  Option,
  OptionItemLabelValue,
  OptionPropertyDescription,
  XPrompt,
} from './schema';
import { Schema } from 'nx/src/utils/params';
import { names } from '@nrwl/devkit/src/utils/names';

export interface GeneratorDefaults {
  [name: string]: string;
}

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

export async function normalizeSchema(
  s: Schema,
  workspaceType: 'ng' | 'nx',
  projectDefaults?: GeneratorDefaults
): Promise<Option[]> {
  // TODO(cammisuli): check what version ng supports hyphenated args
  const hyphenate = workspaceType === 'ng';
  const options = schemaToOptions(s, { hyphenate });
  const requiredFields = new Set(s.required || []);

  const nxOptions = options.map((option) => {
    const xPrompt: XPrompt | undefined = option['x-prompt'];
    const workspaceDefault =
      projectDefaults?.[option.originalName ?? option.name];
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
    } else if (a.isRequired) {
      if (b.isRequired) {
        return a.name.localeCompare(b.name);
      }
      return -1;
    } else if (b.isRequired) {
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
