import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { join } from 'path';
import { ShellExecution, Task, TaskScope } from 'vscode';

export interface NodeTaskDefinition {
  script: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export class NodeTask extends Task {
  /**
   * Creates a task to run a Node script with the given arguments
   */
  static async create(
    definition: NodeTaskDefinition,
  ): Promise<NodeTask | undefined> {
    const nxWorkspace = await getNxWorkspace();
    if (!nxWorkspace) {
      return;
    }

    const { workspacePath } = nxWorkspace;
    const args = definition.args || [];

    const displayCommand = `node ${definition.script} ${args.join(' ')}`.trim();

    // Create a direct ShellExecution rather than using getShellExecutionForConfig
    // since we're not running an Nx command
    const shellExecution = new ShellExecution(
      `node ${definition.script} ${args.join(' ')}`.trim(),
      {
        cwd: definition.cwd
          ? join(workspacePath, definition.cwd)
          : workspacePath,
        env: {
          ...(definition.env || {}),
          NX_CONSOLE: 'true',
        },
      },
    );

    const task = new NodeTask(
      { ...definition, type: 'nx' },
      TaskScope.Workspace,
      displayCommand,
      'node',
      shellExecution,
    );

    return task;
  }

  static async batchCreate(
    definitions: NodeTaskDefinition[],
  ): Promise<NodeTask[]> {
    const tasks = await Promise.all(
      definitions.map((definition) => this.create(definition)),
    );
    return tasks.filter((task) => task !== undefined) as NodeTask[];
  }
}
