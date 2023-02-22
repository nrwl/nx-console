import { checkIsNxWorkspace } from '@nx-console/shared/utils';
import { getShellExecutionForConfig } from '@nx-console/vscode/utils';
import { Task, TaskGroup, TaskScope } from 'vscode';
import { CliTaskDefinition } from './cli-task-definition';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';

export class CliTask extends Task {
  static async create(definition: CliTaskDefinition): Promise<CliTask> {
    const { command } = definition;

    // Using `run [project]:[command]` is more backwards compatible in case different
    // versions of CLI does not handle `[command] [project]` args.
    const args = getArgs(definition);

    const { isStandaloneNx, workspacePath, workspaceType } =
      await getNxWorkspace();
    const useNxCli = workspaceType == 'nx';

    const displayCommand = useNxCli
      ? `nx ${args.join(' ')}`
      : `ng ${args.join(' ')}`;

    const task = new CliTask(
      { ...definition, type: useNxCli ? 'nx' : 'ng' }, // definition
      TaskScope.Workspace, // scope
      displayCommand, // name
      useNxCli ? 'nx' : 'ng',
      // execution
      getShellExecutionForConfig({
        displayCommand,
        cwd: workspacePath,
        standaloneNx: isStandaloneNx,
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

function getArgs(definition: CliTaskDefinition) {
  const { positional, command, flags } = definition;
  switch (command) {
    case 'add':
    case 'build':
    case 'lint':
    case 'generate':
    case 'run':
    case 'serve':
    case 'test':
      return [command, positional, ...flags];
    default:
      return ['run', `${positional}:${command}`, ...flags];
  }
}
