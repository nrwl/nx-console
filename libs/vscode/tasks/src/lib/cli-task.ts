import { getShellExecutionForConfig } from '@nx-console/vscode/utils';
import { Task, TaskScope } from 'vscode';
import { CliTaskDefinition } from './cli-task-definition';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { NxWorkspace } from '@nx-console/shared/types';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { join } from 'path';
import { importNxPackagePath } from '@nx-console/shared/npm';

export class CliTask extends Task {
  /**
   * workspace & packageManagerCommands can be passed in to increase performance when creating multiple tasks
   * if you don't pass them in, they will fetched for you
   */
  static async create(
    definition: CliTaskDefinition,
    workspace?: NxWorkspace,
    packageManagerCommands?: PackageManagerCommands
  ): Promise<CliTask | undefined> {
    // Using `run [project]:[command]` is more backwards compatible in case different
    // versions of CLI does not handle `[command] [project]` args.
    const args = getArgs(definition);

    const nxWorkspace = workspace ?? (await getNxWorkspace());
    if (!nxWorkspace) {
      return;
    }
    const { isEncapsulatedNx, workspacePath } = nxWorkspace;

    const displayCommand = `nx ${args.join(' ')}`;

    const task = new CliTask(
      { ...definition, type: 'nx' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      'nx',
      // execution
      await getShellExecutionForConfig(
        {
          displayCommand,
          cwd: definition.cwd
            ? join(workspacePath, definition.cwd)
            : workspacePath,
          encapsulatedNx: isEncapsulatedNx,
          workspacePath,
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

    if (!w) {
      return [];
    }

    const { detectPackageManager, getPackageManagerCommand } =
      await importNxPackagePath<typeof import('nx/src/utils/package-manager')>(
        w.workspacePath,
        'src/utils/package-manager'
      );
    const packageManagerCommands = getPackageManagerCommand(
      detectPackageManager(w?.workspacePath)
    );

    const tasks = await Promise.all(
      definitions.map((definition) =>
        this.create(definition, w, packageManagerCommands)
      )
    );
    return tasks.filter((task) => task !== undefined) as CliTask[];
  }
}

function getArgs(definition: CliTaskDefinition) {
  const { positional, command, flags } = definition;
  const args = [command, positional, ...flags];
  return args.filter((v) => v !== undefined && v !== null);
}
