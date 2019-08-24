import {
  PseudoTerminal,
  PseudoTerminalConfig,
  PseudoTerminalFactory
} from '@angular-console/server';
import { platform } from 'os';
import {
  Disposable,
  ShellExecution,
  Task,
  TaskExecution,
  TaskPanelKind,
  TaskRevealKind,
  tasks,
  TaskScope,
  Terminal,
  window
} from 'vscode';

let terminalsToReuse: Array<Terminal> = [];
window.onDidCloseTerminal(e => {
  terminalsToReuse = terminalsToReuse.filter(t => t.processId !== e.processId);
});

const activeTaskNames = new Set<string>();
let currentDryRun: TaskExecution | undefined;
let deferredDryRun: ShellExecution | undefined;

export function getPseudoTerminalFactory(): PseudoTerminalFactory {
  return config => {
    if (platform() === 'win32') {
      const isWsl = config.isWsl;
      if (isWsl) {
        return wslPseudoTerminalFactory(config);
      } else {
        return win32PseudoTerminalFactory(config);
      }
    }
    return unixPseudoTerminalFactory(config);
  };
}

function win32PseudoTerminalFactory(
  config: PseudoTerminalConfig
): PseudoTerminal {
  const execution = new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable:
      'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    shellArgs: [
      `-Sta -NoLogo -NonInteractive -C "& {${config.program} ${config.args.join(
        ' '
      )}}"`
    ]
  });

  return executeTask(config, execution);
}

function wslPseudoTerminalFactory(
  config: PseudoTerminalConfig
): PseudoTerminal {
  const execution = new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable: 'C:\\Windows\\System32\\wsl.exe',
    shellArgs: [
      '-e',
      'bash',
      '-l',
      '-c',
      `${config.program} ${config.args.join(' ')}`
    ]
  });

  return executeTask(config, execution);
}

function unixPseudoTerminalFactory(
  config: PseudoTerminalConfig
): PseudoTerminal {
  const execution = new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable: '/bin/bash',
    shellArgs: ['-l', '-c', `${config.program} ${config.args.join(' ')}`]
  });

  return executeTask(config, execution);
}

function getTaskId(isDryRun?: boolean): string {
  let taskId = 'Angular Console';
  if (isDryRun) {
    taskId = 'Dry Run';
  } else {
    let index = 1;
    while (activeTaskNames.has(taskId)) {
      index++;
      taskId = `Angular Console ${index}`;
    }
  }
  return taskId;
}

function executeTask(
  config: PseudoTerminalConfig,
  execution: ShellExecution
): PseudoTerminal {
  // Terminating a task shifts editor focus so we wait until the
  // current dry run finishes before starting the next one.
  if (config.isDryRun && currentDryRun) {
    deferredDryRun = execution;
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
    { type: taskId },
    TaskScope.Workspace,
    taskId,
    config.displayCommand,
    execution
  );

  task.presentationOptions = {
    showReuseMessage: true,
    clear: false,
    reveal: TaskRevealKind.Always,
    panel: TaskPanelKind.Dedicated,
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
            currentDryRun.terminate();
            currentDryRun = undefined;

            if (deferredDryRun) {
              const d = deferredDryRun;
              deferredDryRun = undefined;
              executeTask(config, d).onExit(onExit);
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
