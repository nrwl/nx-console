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
  TaskDefinition,
  TaskExecution,
  TaskPanelKind,
  tasks,
  TaskScope,
  Terminal,
  window,
  TaskRevealKind
} from 'vscode';

let terminalsToReuse: Array<Terminal> = [];
window.onDidCloseTerminal(e => {
  terminalsToReuse = terminalsToReuse.filter(t => t.processId !== e.processId);
});

const activeTaskNames = new Set<string>();
let currentDryRun: TaskExecution | undefined;

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

function executeTask(
  config: PseudoTerminalConfig,
  execution: ShellExecution
): PseudoTerminal {
  let onExit: (code: number) => void;
  let taskExecution: TaskExecution;
  let disposeOnDidEndTaskProcess: Disposable | undefined;

  let taskId = 'Angular Console';
  if (config.isDryRun) {
    if (currentDryRun) {
      currentDryRun.terminate();
    }
    taskId = 'Dry Run';
  } else {
    let index = 1;
    while (activeTaskNames.has(taskId)) {
      index++;
      taskId = `Angular Console ${index}`;
    }
  }

  const taskDefinition: TaskDefinition = { type: taskId };

  const task = new Task(
    taskDefinition,
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
    task.presentationOptions.showReuseMessage = false;
    task.presentationOptions.focus = false;
    task.presentationOptions.clear = true;
    task.presentationOptions.panel = TaskPanelKind.Shared;
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
          onExit(e.exitCode);

          if (e.execution === currentDryRun) {
            currentDryRun = undefined;
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
