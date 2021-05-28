import { Option } from '@nx-console/schema';
import { OptionType } from '@angular/cli/models/interface';
import { commands, ExtensionContext, window, tasks } from 'vscode';

import { ProjectDef } from './cli-task-definition';
import { CliTaskProvider } from './cli-task-provider';
import { selectFlags } from './select-flags';
import { verifyWorkspace } from '@nx-console/vscode/nx-workspace';
import { getTelemetry } from '@nx-console/server';
import { NxTask } from './nx-task';

let cliTaskProvider: CliTaskProvider;
export function registerNxCommands(
  context: ExtensionContext,
  n: CliTaskProvider
) {
  cliTaskProvider = n;
  context.subscriptions.push(
    commands.registerCommand(`nx.affected`, async () => {
      const target = await promptForTarget();
      if (!target) {
        return;
      }
      promptForAffectedFlags(target);
    }),
    ...[
      'apps',
      'build',
      'dep-graph',
      'e2e',
      'libs',
      'lint',
      'test',
    ].map((command) =>
      commands.registerCommand(`nx.affected.${command}`, () =>
        promptForAffectedFlags(command)
      )
    )
  );

  context.subscriptions.push(
    commands.registerCommand('nx.run-many', () => promptForRunMany())
  );

  context.subscriptions.push(
    commands.registerCommand('nx.dep-graph', () => promptForDepGraph())
  );

  context.subscriptions.push(
    commands.registerCommand('nx.list', () => promptForList())
  );

  context.subscriptions.push(
    commands.registerCommand('nx.migrate', () => promptForMigrate())
  );
}

async function promptForTarget(): Promise<string | undefined> {
  const { validWorkspaceJson, json } = verifyWorkspace();

  if (!validWorkspaceJson || !json) {
    return;
  }

  const validTargets = Array.from(
    new Set(
      Object.entries<ProjectDef>(json.projects)
        .map(([_, project]) => Object.keys(project.architect || {}))
        .flat()
    )
  ).sort();

  if (!validTargets.length) {
    window.showErrorMessage(
      'None of your workspace projects have an architect command'
    );
    return;
  }

  return window.showQuickPick(validTargets);
}

const AFFECTED_OPTIONS: Option[] = [
  {
    name: 'base',
    type: OptionType.String,
    description: 'Base of the current branch (usually master)',
  },
  {
    name: 'head',
    type: OptionType.String,
    description: 'Latest commit of the current branch (usually HEAD)',
  },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    description: 'Parallelize the command',
    default: 'false',
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes',
    default: 3,
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    description: 'Isolate projects which previously failed',
    default: 'false',
  },
  { name: 'all', type: OptionType.Boolean, description: 'All projects' },
  {
    name: 'configuration',
    type: OptionType.String,
    description:
      'This is the configuration to use when performing tasks on projects',
  },
  {
    name: 'exclude',
    type: OptionType.String,
    description: 'Exclude certain projects from being processed',
  },
  {
    name: 'files',
    type: OptionType.Array,
    description: 'Manually specify changed files, delimited by commas',
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    description:
      'Rerun the tasks even when the results are available in the cache',
    default: false,
  },
  {
    name: 'verbose',
    type: OptionType.Boolean,
    description: 'Print additional error stack trace on failure',
    default: false,
  },
].map((v) => ({ ...v, aliases: [] }));

const RUN_MANY_OPTIONS: Option[] = [
  { name: 'all', type: OptionType.Boolean, description: 'All projects' },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    description: 'Parallelize the command',
    default: 'false',
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes',
    default: 3,
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    description: 'Isolate projects which previously failed',
    default: 'false',
  },
  {
    name: 'configuration',
    type: OptionType.String,
    description:
      'This is the configuration to use when performing tasks on projects',
  },
  {
    name: 'skip-nx-cache',
    type: OptionType.Boolean,
    description:
      'Rerun the tasks even when the results are available in the cache',
    default: false,
  },
  {
    name: 'with-deps',
    type: OptionType.Boolean,
    description:
      'Include dependencies of specified projects when computing what to run',
    default: false,
  },
  {
    name: 'exclude',
    type: OptionType.String,
    description: 'Exclude certain projects from being processed',
  },
  {
    name: 'verbose',
    type: OptionType.Boolean,
    description: 'Print additional error stack trace on failure',
    default: false,
  },
].map((v) => ({ ...v, aliases: [] }));

const DEP_GRAPH_OPTIONS: Option[] = [
  {
    name: 'file',
    type: OptionType.String,
    description: 'output file (e.g. --file=output.json)',
  },
  {
    name: 'filter',
    type: OptionType.Array,
    description:
      'Use to limit the dependency graph to only show specific projects, list of projects delimited by commas.',
  },
  {
    name: 'exclude',
    type: OptionType.Array,
    description:
      'List of projects delimited by commas to exclude from the dependency graph.',
  },
  {
    name: 'host',
    type: OptionType.String,
    description: 'Bind the dep graph server to a specific ip address.',
  },
].map((v) => ({ ...v, aliases: [] }));

async function promptForAffectedFlags(target: string) {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');

  let positional: string | undefined;
  let command: string;

  switch (target) {
    case 'apps':
    case 'libs':
    case 'dep-graph':
      command = `affected:${target}`;
      break;
    default:
      command = 'affected';
      positional = `--target=${target}`;
      await selectFlags(`affected ${positional}`, AFFECTED_OPTIONS, 'nx');
  }
  const flags = await selectFlags(command, AFFECTED_OPTIONS, 'nx');

  if (flags !== undefined) {
    const task = NxTask.create(
      {
        command,
        flags,
        positional,
      },
      cliTaskProvider.getWorkspacePath()
    );
    tasks.executeTask(task);
  }
}

async function promptForRunMany() {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');

  const target = await promptForTarget();
  if (!target) {
    return;
  }

  let options = RUN_MANY_OPTIONS;
  const projects = validProjectsForTarget(target);
  if (projects && projects.length) {
    options = [
      {
        name: 'projects',
        type: OptionType.Array,
        description: 'Projects to run',
        aliases: [],
        enum: projects,
      },
      ...RUN_MANY_OPTIONS,
    ];
  }

  const flags = await selectFlags('run-many', options, 'nx', { target });

  if (flags !== undefined) {
    const task = NxTask.create(
      {
        command: 'run-many',
        flags,
      },
      cliTaskProvider.getWorkspacePath()
    );
    tasks.executeTask(task);
  }
}

async function promptForDepGraph() {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');

  const flags = await selectFlags('dep-graph', DEP_GRAPH_OPTIONS, 'nx');

  if (flags !== undefined) {
    const task = NxTask.create(
      {
        command: 'dep-graph',
        flags,
      },
      cliTaskProvider.getWorkspacePath()
    );
    tasks.executeTask(task);
  }
}

async function promptForList() {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');
  const task = NxTask.create(
    {
      command: 'list',
      flags: [],
    },
    cliTaskProvider.getWorkspacePath()
  );
  tasks.executeTask(task);
}

async function promptForMigrate() {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');
  const task = NxTask.create(
    {
      command: 'migrate',
      flags: [],
    },
    cliTaskProvider.getWorkspacePath()
  );
  tasks.executeTask(task);
}

function validProjectsForTarget(target: string): string[] | undefined {
  const { validWorkspaceJson, json } = verifyWorkspace();

  if (!validWorkspaceJson || !json) {
    return;
  }

  return Array.from(
    new Set(
      Object.entries<ProjectDef>(json.projects)
        .filter(
          ([_, project]) => project.architect && project.architect[target]
        )
        .map(([project]) => project)
    )
  ).sort();
}
