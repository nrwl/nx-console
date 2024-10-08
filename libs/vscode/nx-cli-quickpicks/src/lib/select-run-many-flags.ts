import { OptionType, Option } from '@nx-console/shared/schema';
import { selectFlags } from './select-flags';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';

export async function selectRunManyFlags(
  target: string
): Promise<string[] | undefined> {
  let options = RUN_MANY_OPTIONS;
  const projects = await validProjectsForTarget(target);
  if (projects && projects.length) {
    options = [
      {
        name: 'projects',
        type: OptionType.Array,
        description: 'Projects to run',
        aliases: [],
        isRequired: false,
        enum: projects,
      },
      ...RUN_MANY_OPTIONS,
    ];
  }

  let customOptions: string | undefined;
  if (target === 'lint') {
    customOptions = '--output-style=stream';
  }

  return await selectFlags('run-many', options, { target }, customOptions);
}

const RUN_MANY_OPTIONS: Option[] = [
  {
    name: 'all',
    type: OptionType.Boolean,
    description: 'All projects',
    isRequired: false,
  },
  {
    name: 'parallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes [default is 3]',
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
    name: 'configuration',
    type: OptionType.String,
    description:
      'This is the configuration to use when performing tasks on projects',
    isRequired: false,
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    description:
      'Rerun the tasks even when the results are available in the cache',
    default: false,
    isRequired: false,
  },
  {
    name: 'with-deps',
    type: OptionType.Boolean,
    description:
      'Include dependencies of specified projects when computing what to run',
    isRequired: false,
    default: false,
  },
  {
    name: 'exclude',
    type: OptionType.String,
    isRequired: false,
    description: 'Exclude certain projects from being processed',
  },
  {
    name: 'verbose',
    type: OptionType.Boolean,
    description: 'Print additional error stack trace on failure',
    isRequired: false,
    default: false,
  },
].map((v) => ({ ...v, aliases: [] }));

async function validProjectsForTarget(
  target: string
): Promise<string[] | undefined> {
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return;
  }
  const { validWorkspaceJson, workspace } = nxWorkspace;

  if (!validWorkspaceJson || !workspace) {
    return;
  }

  return Array.from(
    new Set(
      Object.entries(workspace.projects)
        .filter(([, project]) => project.targets && project.targets[target])
        .map(([project]) => project)
    )
  ).sort();
}
