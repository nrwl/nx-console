import { join } from 'path';
import {
  commands,
  ExtensionContext,
  QuickPickItem,
  QuickPickItemKind,
  tasks,
  window,
} from 'vscode';

import { readAndParseJson } from '@nx-console/shared/file-system';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { resolveDependencyVersioning } from '@nx-console/vscode/utils';

import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import {
  selectAffectedFlags,
  selectRunManyFlags,
} from '@nx-console/vscode/nx-cli-quickpicks';
import { logAndShowError } from '@nx-console/vscode/output-channels';
import { NxTask } from './nx-task';
import { getTelemetry } from '@nx-console/vscode/telemetry';

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
      })
    )
  );

  context.subscriptions.push(
    commands.registerCommand('nx.run-many', () => {
      getTelemetry().logUsage('tasks.run-many');
      promptForRunMany();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('nx.list', () => {
      getTelemetry().logUsage('cli.list');
      promptForList();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('nx.migrate', () => {
      getTelemetry().logUsage('cli.migrate');
      promptForMigrate();
    })
  );
}

async function promptForTarget(): Promise<string | undefined> {
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return;
  }
  const { validWorkspaceJson, workspace } = nxWorkspace;

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

async function promptForAffectedFlags(target: string) {
  const { positional, command, flags } = await selectAffectedFlags(target);

  if (flags !== undefined) {
    let problemMatchers: string[] | undefined;
    if (target === 'lint') {
      problemMatchers = ['$eslint-stylish'];
    }

    const task = await NxTask.create({
      command,
      flags,
      positional,
    });
    if (task && problemMatchers) {
      task.problemMatchers = problemMatchers;
    }
    if (!task) {
      logAndShowError(
        'Error while creating task. Please see the logs for more information.'
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
    let problemMatchers: string[] | undefined;
    if (target === 'lint') {
      problemMatchers = ['$eslint-stylish'];
    }

    const task = await NxTask.create({
      command: 'run-many',
      flags,
    });
    if (task && problemMatchers) {
      task.problemMatchers = problemMatchers;
    }
    if (!task) {
      logAndShowError(
        'Error while creating task. Please see the logs for more information.'
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
      'Error while creating task. Please see the logs for more information.'
    );
    return;
  }
  tasks.executeTask(task);
}

async function promptForMigrate() {
  const workspacePath = getNxWorkspacePath();

  if (!workspacePath) {
    return;
  }

  const isEncapsulatedNx = (await getNxWorkspace())?.isEncapsulatedNx ?? false;
  const packageJson = await readAndParseJson(
    join(
      workspacePath,
      isEncapsulatedNx
        ? join('.nx', 'installation', 'package.json')
        : 'package.json'
    )
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

    if (!task) {
      window.showErrorMessage('Error while creating task, ');
      return;
    }
    tasks.executeTask(task);
  }
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
