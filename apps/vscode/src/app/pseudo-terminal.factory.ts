import {
  PseudoTerminal,
  PseudoTerminalConfig,
  PseudoTerminalFactory
} from '@angular-console/server';
import {
  Disposable,
  Task,
  TaskExecution,
  TaskRevealKind,
  tasks,
  TaskScope
} from 'vscode';

import { getShellExecutionForConfig } from './ng-task-provider/shell-execution';

const activeTaskNames = new Set<string>();
let currentDryRun: TaskExecution | undefined;
let deferredDryRun: PseudoTerminalConfig | undefined;

export function getPseudoTerminalFactory(): PseudoTerminalFactory {
  return config => executeTask(config);
}

export function getTaskId(isDryRun?: boolean): string {
  let taskId = 'angular console';
  if (isDryRun) {
    taskId = 'ng g --dry-run';
  } else {
    let index = 1;
    while (activeTaskNames.has(taskId)) {
      index++;
      taskId = `angular console ${index}`;
    }
  }
  return taskId;
}

export function executeTask(config: PseudoTerminalConfig): PseudoTerminal {
  const execution = getShellExecutionForConfig(config);

  // Terminating a task shifts editor focus so we wait until the
  // current dry run finishes before starting the next one.
  if (config.isDryRun && currentDryRun) {
    deferredDryRun = config;
    return {
      kill: () => {},
      onExit: () => {}
    };
  }

  let onExit: (code: number) => void;
  let taskExecution: TaskExecution;
  let disposeOnDidEndTaskProcess: Disposable | undefined;

  const taskId = getTaskId(config.isDryRun);
  const task = new Task(
    { type: 'shell' },
    TaskScope.Workspace,
    taskId,
    config.displayCommand,
    execution
  );

  task.presentationOptions = {
    showReuseMessage: true,
    clear: false,
    reveal: TaskRevealKind.Always,
    focus: true
  };

  if (config.isDryRun) {
    task.presentationOptions = {
      ...task.presentationOptions,
      showReuseMessage: false,
      clear: true,
      focus: false
    };
  }

  tasks.executeTask(task).then(
    t => {
      if (config.isDryRun) {
        currentDryRun = t;
      } else {
        activeTaskNames.add(task.name);
      }
      taskExecution = t;
      disposeOnDidEndTaskProcess = tasks.onDidEndTaskProcess(e => {
        if (e.execution.task === task) {
          if (e.execution === currentDryRun) {
            currentDryRun = undefined;

            if (deferredDryRun) {
              executeTask(deferredDryRun).onExit(onExit);
              deferredDryRun = undefined;
            }
          } else {
            onExit(e.exitCode);
          }
        }
      });
    },
    () => {
      onExit(1);
    }
  );

  return {
    kill: () => {
      taskExecution.terminate();
      onExit(1);
    },
    onExit: o => {
      onExit = (exitCode: number) => {
        o(exitCode);
        activeTaskNames.delete(task.name);
        if (disposeOnDidEndTaskProcess) {
          disposeOnDidEndTaskProcess.dispose();
        }
      };
    }
  };
}
