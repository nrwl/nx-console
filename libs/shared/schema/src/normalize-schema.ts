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

  return nxOptions.sort(compareOptions);
}

/**
 * sorts options in the following order
 * - required
 * - x-priority: important
 * - everything else
 * - x-priority: internal
 * - deprecated
 * if two options are equal, they are sorted by name
 */
function compareOptions(a: Option, b: Option): number {
  function getPrio(opt: Option): number {
    if (opt.isRequired) {
      return 0;
    }
    if (opt['x-priority'] === 'important') {
      return 1;
    }
    if (opt['x-deprecated']) {
      return 4;
    }
    if (opt['x-priority'] === 'internal') {
      return 3;
    }
    return 2;
  }

  const aPrio = getPrio(a);
  const bPrio = getPrio(b);
  if (aPrio === bPrio) {
    return a.name.localeCompare(b.name);
  }
  return aPrio - bPrio;
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
