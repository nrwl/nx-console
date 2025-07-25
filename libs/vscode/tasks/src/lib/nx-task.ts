import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';

import { getOutputChannel } from '@nx-console/vscode-output-channels';
import { getShellExecutionForConfig } from '@nx-console/vscode-utils';
import { join } from 'path';
import { Task, TaskScope } from 'vscode';

export interface NxTaskDefinition {
  positional?: string;
  command: string;
  flags: Array<string>;
  cwd?: string;
  useLatestVersion?: boolean;
}

export class NxTask extends Task {
  static async create(
    definition: NxTaskDefinition,
  ): Promise<NxTask | undefined> {
    const { command, flags, positional, cwd } = definition;

    const args: string[] = [
      command,
      ...(positional ? [positional] : []),
      ...flags,
    ];

    const workspace = await getNxWorkspace();
    if (!workspace) {
      getOutputChannel().appendLine(
        'Error while creating task: no workspace found',
      );
      return;
    }

    const { workspacePath, isEncapsulatedNx } = workspace;
    const displayCommand = `${definition.useLatestVersion ? '-y nx@latest' : 'nx'} ${args.join(' ')}`;
    const task = new NxTask(
      { ...definition, type: 'nx' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      'nx', // source
      // execution
      await getShellExecutionForConfig({
        displayCommand,
        cwd: cwd ? join(workspacePath, cwd) : workspacePath,
        encapsulatedNx: isEncapsulatedNx,
        workspacePath,
      }),
    );
    return task;
  }
}
