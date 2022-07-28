import {
  checkIsNxWorkspace,
  getShellExecutionForConfig,
} from '@nx-console/utils';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { CliTaskDefinition } from './cli-task-definition';

export class CliTask extends Task {
  static async create(
    definition: CliTaskDefinition,
    workspacePath: string
  ): Promise<CliTask> {
    const { command } = definition;

    // Using `run [project]:[command]` is more backwards compatible in case different
    // versions of CLI does not handle `[command] [project]` args.
    const args = getArgs(definition);

    const useNxCli = await checkIsNxWorkspace(workspacePath);

    const displayCommand = useNxCli
      ? `nx ${args.join(' ')}`
      : `ng ${args.join(' ')}`;

    const task = new CliTask(
      { ...definition, type: useNxCli ? 'nx' : 'ng' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      useNxCli ? 'nx' : 'ng',
      // execution
      getShellExecutionForConfig({
        displayCommand,
        cwd: workspacePath,
      })
    );

    switch (command) {
      case 'build':
        task.group = TaskGroup.Build;
        task.problemMatchers.push('$webpack-builder');
        break;
      default:
        task.group = TaskGroup.Test;
    }

    return task;
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
