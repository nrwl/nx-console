import { Option } from '@nx-console/schema';
import { OptionType } from '@angular/cli/models/interface';
import { commands, ExtensionContext, window, tasks } from 'vscode';

import { ProjectDef } from '../cli-task/cli-task-definition';
import { CliTaskProvider } from '../cli-task/cli-task-provider';
import { selectFlags } from '../cli-task/select-flags';
import { verifyWorkspaceJson } from '../verify-workspace/verify-angular-json';
import { getTelemetry } from '../telemetry';
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
    ...['apps', 'build', 'dep-graph', 'e2e', 'libs', 'lint', 'test'].map(
      command =>
        commands.registerCommand(`nx.affected.${command}`, () =>
          promptForAffectedFlags(command)
        )
    )
  );
}

async function promptForTarget(): Promise<string | undefined> {
  const { validWorkspaceJson, json } = verifyWorkspaceJson(
    cliTaskProvider.getWorkspaceJsonPath()
  );

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
    description: 'Base of the current branch (usually master)'
  },
  {
    name: 'head',
    type: OptionType.String,
    description: 'Latest commit of the current branch (usually HEAD)'
  },
  {
    name: 'parallel',
    type: OptionType.Boolean,
    description: 'Parallelize the command',
    default: 'false'
  },
  {
    name: 'maxParallel',
    type: OptionType.Number,
    description: 'Max number of parallel processes',
    default: 3
  },
  {
    name: 'only-failed',
    type: OptionType.Boolean,
    description: 'Isolate projects which previously failed',
    default: 'false'
  },
  { name: 'all', type: OptionType.Boolean, description: 'All projects' },
  {
    name: 'configuration',
    type: OptionType.String,
    description:
      'This is the configuration to use when performing tasks on projects'
  },
  {
    name: 'exclude',
    type: OptionType.String,
    description: 'Exclude certain projects from being processed'
  },
  {
    name: 'files',
    type: OptionType.Array,
    description: 'Manually specify changed files, delimited by commas'
  }
].map(v => ({ ...v, aliases: [] }));

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
        positional
      },
      cliTaskProvider.getWorkspacePath()
    );
    tasks.executeTask(task);
  }
}
