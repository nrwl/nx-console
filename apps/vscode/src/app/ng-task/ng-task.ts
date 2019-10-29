import { NgTaskDefinition } from './ng-task-definition';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';
import { FileUtils } from '@angular-console/server';

export class NgTask extends Task {
  static create(
    definition: NgTaskDefinition,
    workspacePath: string,
    fileUtils: FileUtils
  ): NgTask {
    const { positional, command, flags } = definition;

    const args: Array<string> = [command, positional, ...flags];

    const displayCommand = `ng ${args.join(' ')}`;
    const task = new NgTask(
      { ...definition, type: 'ng' },
      TaskScope.Workspace,
      'angular-console',
      displayCommand,
      getShellExecutionForConfig({
        displayCommand,
        args,
        cwd: workspacePath,
        name: displayCommand,
        program: fileUtils.findClosestNg(workspacePath)
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
