import { Task, TaskScope } from 'vscode';
import { getShellExecutionForConfig } from './shell-execution';

export interface NxTaskDefinition {
  positional?: string;
  command: string;
  flags: Array<string>;
}

export class NxTask extends Task {
  static create(definition: NxTaskDefinition, workspacePath: string): NxTask {
    const { command, flags, positional } = definition;

    const args: string[] = [
      command,
      ...(positional ? [positional] : []),
      ...flags,
    ];

    const displayCommand = `nx ${args.join(' ')}`;
    const task = new NxTask(
      { ...definition, type: 'nx' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      'nx', // source
      // execution
      getShellExecutionForConfig({
        displayCommand,
        cwd: workspacePath,
      })
    );
    return task;
  }
}
