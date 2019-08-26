import { NgTaskDefinition } from './ng-task-definition';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';
import { FileUtils } from '@angular-console/server';
import { getTaskId } from '../pseudo-terminal.factory';

export class NgTask extends Task {
  static create(
    definition: NgTaskDefinition,
    workspacePath: string,
    fileUtils: FileUtils
  ): NgTask {
    const { projectName, architectName, configuration } = definition;

    const runTarget = configuration
      ? `${projectName}:${architectName}:${configuration}`
      : `${projectName}:${architectName}`;

    let displayCommand = `ng run ${runTarget}`;
    switch (architectName) {
      case 'build':
      case 'lint':
      case 'deploy':
      case 'e2e':
      case 'serve':
      case 'test':
      case 'xi18n':
        displayCommand = configuration
          ? `ng ${architectName} ${projectName} --configuration=${configuration}`
          : `ng ${architectName} ${projectName}`;
    }

    const task = new NgTask(
      definition,
      TaskScope.Workspace,
      getTaskId(),
      displayCommand,
      getShellExecutionForConfig({
        isDryRun: false,
        isWsl: fileUtils.isWsl(),
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
