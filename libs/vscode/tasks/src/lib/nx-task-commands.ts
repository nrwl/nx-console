import {
  commands,
  ExtensionContext,
  QuickPickItem,
  QuickPickItemKind,
  tasks,
  window,
} from 'vscode';
import { join } from 'path';

import { Option, OptionType } from '@nx-console/shared/schema';
import {
  getTelemetry,
  resolveDependencyVersioning,
} from '@nx-console/vscode/utils';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { readAndParseJson } from '@nx-console/shared/file-system';

import { NxTask } from './nx-task';
import { selectFlags } from './select-flags';

export function registerNxCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`nx.affected`, async () => {
      getTelemetry().featureUsed('nx.affected');
      const target = await promptForTarget();
      if (!target) {
        return;
      }
      promptForAffectedFlags(target);
    }),
    ...['apps', 'build', 'e2e', 'libs', 'lint', 'test'].map((command) =>
      commands.registerCommand(`nx.affected.${command}`, () => {
        getTelemetry().featureUsed(`nx.affected.${command}`);
        promptForAffectedFlags(command);
      })
    )
  );

  context.subscriptions.push(
    commands.registerCommand('nx.run-many', () => {
      getTelemetry().featureUsed('nx.run-many');
      promptForRunMany();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('nx.list', () => {
      getTelemetry().featureUsed('nx.list');
      promptForList();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('nx.migrate', () => {
      getTelemetry().featureUsed('nx.migrate');
      promptForMigrate();
    })
  );
}

async function promptForTarget(): Promise<string | undefined> {
  const { validWorkspaceJson, workspace } = await getNxWorkspace();

  if (!validWorkspaceJson || !workspace) {
    return;
  }

  const validTargets = Array.from(
    new Set(
      Object.entries(workspace.projects)
        .map(([, project]) => Object.keys(project.targets || {}))
        .flat()
    )
  ).sort();

  if (!validTargets.length) {
    window.showErrorMessage(
      'None of your workspace projects have an architect or targets command'
    );
    return;
  }

  return window.showQuickPick(validTargets);
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

async function promptForAffectedFlags(target: string) {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');

  const { positional, command, flags } = await selectAffectedFlags(target);

  if (flags !== undefined) {
    const task = await NxTask.create({
      command,
      flags,
      positional,
    });
    tasks.executeTask(task);
  }
}

/**
 *
 */
async function selectAffectedFlags(target: string): Promise<{
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
      const positional = `--target=${target}`;
      return {
        command: 'affected',
        positional,
        flags: await selectFlags(`affected ${positional}`, AFFECTED_OPTIONS),
      };
    }
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

  const flags = await selectFlags('run-many', options, { target });

  if (flags !== undefined) {
    const task = await NxTask.create({
      command: 'run-many',
      flags,
    });
    tasks.executeTask(task);
  }
}

async function promptForList() {
  const telemetry = getTelemetry();
  telemetry.featureUsed('affected-cli');
  const task = await NxTask.create({
    command: 'list',
    flags: [],
  });
  tasks.executeTask(task);
}

async function promptForMigrate() {
  const telemetry = getTelemetry();
  telemetry.featureUsed('migrate command');

  const { workspacePath } = await getNxWorkspace();

  const packageJson = await readAndParseJson(
    join(workspacePath, 'package.json')
  );

  const dependencyToMigrate = await window.showQuickPick(
    buildQuickPickItems(packageJson),
    {
      title: 'Select dependency',
      placeHolder: 'Select the dependency you want to migrate.',
    }
  );

  if (dependencyToMigrate === undefined) {
    return;
  }

  const depVersioningInfo = await resolveDependencyVersioning(
    dependencyToMigrate.label
  );

  if (depVersioningInfo !== undefined) {
    const { dep, version } = depVersioningInfo;

    const task = await NxTask.create({
      command: 'migrate',
      flags: [`${dep}@${version}`],
    });

    tasks.executeTask(task);
  }
}

async function validProjectsForTarget(
  target: string
): Promise<string[] | undefined> {
  const { validWorkspaceJson, workspace } = await getNxWorkspace();

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

function buildQuickPickItems({
  dependencies = {},
  devDependencies = {},
}: {
  dependencies: { [key: string]: string };
  devDependencies: { [key: string]: string };
}): QuickPickItem[] {
  const depsQuickPickItems: QuickPickItem[] =
    Object.keys(dependencies).length > 0
      ? [
          {
            label: 'dependencies',
            kind: QuickPickItemKind.Separator,
          },
          ...Object.keys(dependencies).map((item) => ({
            label: item,
          })),
        ]
      : [];

  const devDepsQuickPickItems: QuickPickItem[] =
    Object.keys(devDependencies).length > 0
      ? [
          {
            label: 'devDependencies',
            kind: QuickPickItemKind.Separator,
          },
          ...Object.keys(devDependencies).map((item) => ({
            label: item,
          })),
        ]
      : [];

  return [...depsQuickPickItems, ...devDepsQuickPickItems];
}
