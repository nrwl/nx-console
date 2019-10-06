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
    const { projectName, architectName, flags } = definition;

    const runTarget = `${projectName}:${architectName}`;

    let args = ['run', runTarget];
    switch (architectName) {
      case 'build':
      case 'lint':
      case 'deploy':
      case 'e2e':
      case 'serve':
      case 'test':
      case 'xi18n':
      case 'add':
        args = [architectName];
        if (projectName) args.push(projectName);
        break;
      case 'generate':
        args = [];
        break;
    }

    if (flags) {
      args = [...args, ...flags.trim().split(/\s+/)];
    }

    const displayCommand = `ng ${args.join(' ')}`;
    const task = new NgTask(
      definition,
      TaskScope.Workspace,
      getTaskId(),
      displayCommand,
      getShellExecutionForConfig({
        isDryRun: false,
        isWsl: fileUtils.isWsl(),
        displayCommand,
        args,
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
