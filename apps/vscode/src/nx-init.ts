import { getTelemetry } from '@nx-console/vscode/utils';
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
    commands.registerCommand('nx.init', async () => {
      getTelemetry().featureUsed('nx.init');
      const workspacePath =
        workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;
      const command = 'nx@latest init';
      const task = new Task(
        { type: 'nx' }, // definition
        TaskScope.Workspace, // scope
        command, // name
        'nx',
        // execution
        new ShellExecution(`npx ${command}`, {
          cwd: workspacePath,
        })
      );
      task.presentationOptions.focus = true;

      tasks.executeTask(task);
    })
  );
}
