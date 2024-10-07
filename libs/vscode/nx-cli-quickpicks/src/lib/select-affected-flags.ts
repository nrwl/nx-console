import { OptionType, Option } from '@nx-console/shared/schema';
import { selectFlags } from './select-flags';

// TODO: REMOVE HARD CODED LIST OF FLAGS
export async function selectAffectedFlags(target: string): Promise<{
  command: string;
  flags: string[] | undefined;
  positional?: string;
}> {
  switch (target) {
    case 'apps':
    case 'libs': {
      const command = `affected:${target}`;
      return {
        command,
        flags: await selectFlags(command, AFFECTED_OPTIONS),
      };
    }
    default: {
      let customOptions: string | undefined;
      if (target === 'lint') {
        customOptions = '--output-style=stream';
      }
      return {
        command: 'affected',
        flags: await selectFlags(
          `affected`,
          AFFECTED_OPTIONS,
          {
            target,
          },
          customOptions
        ),
      };
    }
  }
}

const AFFECTED_OPTIONS: Option[] = [
  {
    name: 'base',
    type: OptionType.String,
    isRequired: false,
    description: 'Base of the current branch (usually main)',
  },
  {
    name: 'head',
    type: OptionType.String,
    isRequired: false,
    description: 'Latest commit of the current branch (usually HEAD)',
  },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    description: 'Parallelize the command',
    isRequired: false,
    default: 'false',
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes',
    isRequired: false,
    default: 3,
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    description: 'Isolate projects which previously failed',
    isRequired: false,
    default: 'false',
  },
  {
    name: 'all',
    type: OptionType.Boolean,
    description: 'All projects',
    isRequired: false,
  },
  {
    name: 'configuration',
    type: OptionType.String,
    isRequired: false,
    description:
      'This is the configuration to use when performing tasks on projects',
  },
  {
    name: 'exclude',
    type: OptionType.String,
    isRequired: false,
    description: 'Exclude certain projects from being processed',
  },
  {
    name: 'files',
    type: OptionType.Array,
    isRequired: false,
    description: 'Manually specify changed files, delimited by commas',
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    description:
      'Rerun the tasks even when the results are available in the cache',
    isRequired: false,
    default: false,
  },
  {
    name: 'verbose',
    type: OptionType.Boolean,
    isRequired: false,
    description: 'Print additional error stack trace on failure',
    default: false,
  },
].map((v) => ({ ...v, aliases: [] }));
