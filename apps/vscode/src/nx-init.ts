import { getTelemetry } from '@nx-console/vscode/telemetry';
import {
  commands,
  ExtensionContext,
  ShellExecution,
  Task,
  tasks,
  TaskScope,
  workspace,
} from 'vscode';

export function initNxInit(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      'nx.init',
      async (triggeredFromAngularMigrate?: boolean) => {
        getTelemetry().logUsage('cli.init', {
          source:
            triggeredFromAngularMigrate === true
              ? 'migrate-angular-prompt'
              : undefined,
        });
        const workspacePath =
          workspace.workspaceFolders &&
          workspace.workspaceFolders[0].uri.fsPath;
        const command = 'nx@latest init';
        const task = new Task(
          { type: 'nx' }, // definition
          TaskScope.Workspace, // scope
          command, // name
          'nx',
          // execution
          new ShellExecution(`npx ${command}`, {
            cwd: workspacePath,
            env: {
              NX_CONSOLE: 'true',
            },
          })
        );
        task.presentationOptions.focus = true;

        tasks.executeTask(task);
      }
    )
  );
}
