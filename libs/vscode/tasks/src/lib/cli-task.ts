import { getShellExecutionForConfig } from '@nx-console/vscode/utils';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { CliTaskDefinition } from './cli-task-definition';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { NxWorkspace } from '@nx-console/shared/types';
import {
  detectPackageManager,
  getPackageManagerCommand,
  PackageManagerCommands,
} from 'nx/src/utils/package-manager';
import { join } from 'path';

export class CliTask extends Task {
  /**
   * workspace & packageManagerCommands can be passed in to increase performance when creating multiple tasks
   * if you don't pass them in, they will fetched for you
   */
  static async create(
    definition: CliTaskDefinition,
    workspace?: NxWorkspace,
    packageManagerCommands?: PackageManagerCommands
  ): Promise<CliTask> {
    // Using `run [project]:[command]` is more backwards compatible in case different
    // versions of CLI does not handle `[command] [project]` args.
    const args = getArgs(definition);

    const { isEncapsulatedNx, workspacePath } =
      workspace ?? (await getNxWorkspace());

    const displayCommand = `nx ${args.join(' ')}`;

    const task = new CliTask(
      { ...definition, type: 'nx' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      'nx',
      // execution
      getShellExecutionForConfig(
        {
          displayCommand,
          cwd: definition.cwd
            ? join(workspacePath, definition.cwd)
            : workspacePath,
          encapsulatedNx: isEncapsulatedNx,
        },
        packageManagerCommands
      )
    );

    return task;
  }

  static async batchCreate(
    definitions: CliTaskDefinition[],
    workspace?: NxWorkspace
  ): Promise<CliTask[]> {
    const w = workspace ?? (await getNxWorkspace());

    const packageManagerCommands = getPackageManagerCommand(
      detectPackageManager(w.workspacePath)
    );
    return await Promise.all(
      definitions.map((definition) =>
        this.create(definition, w, packageManagerCommands)
      )
    );
  }
}

function getArgs(definition: CliTaskDefinition) {
  const { positional, command, flags } = definition;
  switch (command) {
    case 'add':
    case 'build':
    case 'lint':
    case 'generate':
    case 'run':
    case 'serve':
    case 'test':
      return [command, positional, ...flags];
    default:
      return ['run', `${positional}:${command}`, ...flags];
  }
}
