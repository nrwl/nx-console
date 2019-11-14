import { NgTaskDefinition } from './ng-task-definition';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';
import { findClosestNg } from '@angular-console/server';

export class NgTask extends Task {
  static create(definition: NgTaskDefinition, workspacePath: string): NgTask {
    const { positional, command, flags } = definition;

    const args: Array<string> = [command, positional, ...flags];

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
