import { NgTaskDefinition } from './ng-task-definition';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';
import { findClosestNg } from '@angular-console/server';

export class NgTask extends Task {
  static create(definition: NgTaskDefinition, workspacePath: string): NgTask {
    const { command } = definition;

    // Using `run [project]:[command]` is more backwards compatible in case different
    // versions of CLI does not handle `[command] [project]` args.
    const args = getArgs(definition);

    const displayCommand = `ng ${args.join(' ')}`;
    const task = new NgTask(
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
        program: findClosestNg(workspacePath)
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

function getArgs(definition: NgTaskDefinition) {
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
