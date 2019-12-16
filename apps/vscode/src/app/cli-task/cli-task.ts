import { CliTaskDefinition } from './cli-task-definition';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';
import { findClosestNg, findClosestNx } from '@angular-console/server';
import { join } from 'path';

export class CliTask extends Task {
  static create(
    definition: CliTaskDefinition,
    workspaceJsonPath: string
  ): CliTask {
    const workspacePath = join(workspaceJsonPath, '..');
    const { command } = definition;

    // Using `run [project]:[command]` is more backwards compatible in case different
    // versions of CLI does not handle `[command] [project]` args.
    const args = getArgs(definition);

    const useNxCli = workspaceJsonPath.endsWith('workspace.json');
    const program = useNxCli
      ? findClosestNx(workspacePath)
      : findClosestNg(workspacePath);

    const displayCommand = useNxCli
      ? `nx ${args.join(' ')}`
      : `ng ${args.join(' ')}`;

    const task = new CliTask(
      { ...definition, type: 'ng' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      'angular-console', // source
      // execution
      getShellExecutionForConfig({
        displayCommand,
        args,
        cwd: workspacePath,
        name: displayCommand,
        program
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
