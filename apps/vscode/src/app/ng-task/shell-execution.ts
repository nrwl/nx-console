import { ShellExecution } from 'vscode';
import { platform } from 'os';

export interface ShellConfig {
  /** Human-readable string which will be used to represent the terminal in the UI. */
  name: string;
  program: string;
  args: string[];
  cwd: string;
  displayCommand: string;
}

export function getShellExecutionForConfig(
  config: ShellConfig
): ShellExecution {
  let execution: ShellExecution;
  if (platform() === 'win32') {
    execution = getWin32ShellExecution(config);
  } else {
    execution = getUnixShellExecution(config);
  }

  return execution;
}

function getWin32ShellExecution(config: ShellConfig): ShellExecution {
  return new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable:
      'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    shellArgs: [
      `-Sta -NoLogo -NonInteractive -C "& {${config.program.replace(
        / /g,
        '` ' // NOTE: In powershell ` is the escape key.
      )} ${config.args.join(' ')}}"`
    ]
  });
}

function getUnixShellExecution(config: ShellConfig): ShellExecution {
  return new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable: '/bin/bash',
    shellArgs: [
      '-l',
      '-c',
      `${config.program.replace(/ /g, '\\ ')} ${config.args.join(' ')}`
    ]
  });
}
