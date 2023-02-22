import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { getShellExecutionForConfig } from '@nx-console/vscode/utils';
import { Task, TaskScope } from 'vscode';

export interface NxTaskDefinition {
  positional?: string;
  command: string;
  flags: Array<string>;
}

export class NxTask extends Task {
  static async create(definition: NxTaskDefinition): Promise<NxTask> {
    const { command, flags, positional } = definition;

    const args: string[] = [
      command,
      ...(positional ? [positional] : []),
      ...flags,
    ];

    const { isStandaloneNx, workspacePath } = await getNxWorkspace();

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
        standaloneNx: isStandaloneNx,
      })
    );
    return task;
  }
}
