import { commands, ExtensionContext, tasks, window } from 'vscode';

import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';

import {
  selectAffectedFlags,
  selectRunManyFlags,
} from '@nx-console/vscode-nx-cli-quickpicks';
import { logAndShowError } from '@nx-console/vscode-output-channels';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { NxTask } from './nx-task';

export function registerNxCommands(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(`nx.affected`, async () => {
      getTelemetry().logUsage('cli.affected');
      const target = await promptForTarget();
      if (!target) {
        return;
      }
      promptForAffectedFlags(target);
    }),
    ...['build', 'e2e', 'lint', 'test'].map((target) =>
      commands.registerCommand(`nx.affected.${target}`, () => {
        getTelemetry().logUsage(`cli.affected`);
        promptForAffectedFlags(target);
      }),
    ),
  );

  context.subscriptions.push(
    commands.registerCommand('nx.run-many', () => {
      getTelemetry().logUsage('tasks.run-many');
      promptForRunMany();
    }),
  );

  context.subscriptions.push(
    commands.registerCommand('nx.list', () => {
      getTelemetry().logUsage('cli.list');
      promptForList();
    }),
  );
}

async function promptForTarget(): Promise<string | undefined> {
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return;
  }
  const { validWorkspaceJson, projectGraph } = nxWorkspace;

  if (!validWorkspaceJson) {
    return;
  }

  const validTargets = Array.from(
    new Set(
      Object.entries(projectGraph.nodes)
        .map(([, project]) => Object.keys(project.data.targets || {}))
        .flat(),
    ),
  ).sort();

  if (!validTargets.length) {
    window.showErrorMessage(
      'None of your workspace projects have an architect or targets command',
    );
    return;
  }

  return window.showQuickPick(validTargets);
}

async function promptForAffectedFlags(target: string) {
  const { positional, command, flags } = await selectAffectedFlags(target);

  if (flags !== undefined) {
    const task = await NxTask.create({
      command,
      flags,
      positional,
    });
    if (!task) {
      logAndShowError(
        'Error while creating task. Please see the logs for more information.',
      );
      return;
    }
    tasks.executeTask(task);
  }
}

async function promptForRunMany() {
  const target = await promptForTarget();
  if (!target) {
    return;
  }

  const flags = await selectRunManyFlags(target);

  if (flags !== undefined) {
    const task = await NxTask.create({
      command: 'run-many',
      flags,
    });
    if (!task) {
      logAndShowError(
        'Error while creating task. Please see the logs for more information.',
      );
      return;
    }
    tasks.executeTask(task);
  }
}

async function promptForList() {
  const task = await NxTask.create({
    command: 'list',
    flags: [],
  });
  if (!task) {
    logAndShowError(
      'Error while creating task. Please see the logs for more information.',
    );
    return;
  }
  tasks.executeTask(task);
}
