import { NgTaskDefinition } from './interfaces';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';
import { FileUtils } from '@angular-console/server';

export class NgTask extends Task {
  static create(
    definition: NgTaskDefinition,
    workspacePath: string,
    fileUtils: FileUtils
  ): NgTask {
    const { type, projectName, architectName, configuration } = definition;

    const runTarget = configuration
      ? `${projectName}:${architectName}:${configuration}`
      : `${projectName}:${architectName}`;

    const displayCommand = `ng run ${runTarget}`;

    const task = new NgTask(
      definition,
      TaskScope.Workspace,
      type,
      displayCommand,
      getShellExecutionForConfig({
        isDryRun: false,
        isWsl: false,
        displayCommand,
        args: ['run', runTarget],
        cwd: workspacePath,
        name: displayCommand,
        program: fileUtils.findClosestNg(workspacePath)
      })
    );

    switch (architectName) {
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
