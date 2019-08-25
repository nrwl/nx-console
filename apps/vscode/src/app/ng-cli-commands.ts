import {
  commands,
  ExtensionContext,
  Task,
  tasks,
  window,
  TaskScope
} from 'vscode';

import { NgTaskProvider } from './ng-task-provider/ng-task-provider';
import { NgTaskDefinition } from './ng-task-provider/ng-task-definition';

let ngTaskProvider: NgTaskProvider;
export function registerNgCliCommands(
  context: ExtensionContext,
  n: NgTaskProvider
) {
  ngTaskProvider = n;

  ['build', 'lint', 'deploy', 'e2e', 'serve', 'test', 'xi18n'].forEach(
    command => {
      context.subscriptions.push(
        commands.registerCommand(
          `ng-console.${command}`,
          runNgCliCommand(command)
        )
      );
    }
  );
}

function runNgCliCommand(command: string) {
  return () => {
    const items = ngTaskProvider
      .getProjectEntries()
      .map(([projectName, { architect }]) => ({
        projectName,
        architectDef: architect && architect[command]
      }))
      .filter(({ architectDef }) => Boolean(architectDef))
      .flatMap(({ architectDef, projectName }) =>
        [undefined, ...Object.keys(architectDef!.configurations || {})].map(c =>
          c ? `${projectName} --configuration=${c}` : projectName
        )
      );

    window.showQuickPick(items).then(selection => {
      if (!selection) {
        return;
      }

      const [projectName, configuration] = selection.split(' --configuration=');
      const taskDef: NgTaskDefinition = {
        type: 'ng',
        projectName,
        configuration,
        architectName: command
      };
      const task = ngTaskProvider.resolveTask(
        new Task(taskDef, TaskScope.Workspace, 'n/a', 'n/a')
      );
      if (task) {
        tasks.executeTask(task);
      }
    });
  };
}
