import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { getShellExecutionForConfig } from '@nx-console/vscode/utils';
import { join } from 'path';
import { Task, TaskScope } from 'vscode';

export interface NxTaskDefinition {
  positional?: string;
  command: string;
  flags: Array<string>;
  cwd?: string;
}

export class NxTask extends Task {
  static async create(definition: NxTaskDefinition): Promise<NxTask> {
    const { command, flags, positional, cwd } = definition;

    const args: string[] = [
      command,
      ...(positional ? [positional] : []),
      ...flags,
    ];

    const { isEncapsulatedNx, workspacePath } = await getNxWorkspace();

    const displayCommand = `nx ${args.join(' ')}`;
    const task = new NxTask(
      { ...definition, type: 'nx' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      'nx', // source
      // execution
      getShellExecutionForConfig({
        displayCommand,
        cwd: cwd ? join(workspacePath, cwd) : workspacePath,
        encapsulatedNx: isEncapsulatedNx,
      })
    );
    return task;
  }
}
