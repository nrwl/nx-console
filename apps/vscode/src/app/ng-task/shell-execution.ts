import { PseudoTerminalConfig } from '@angular-console/server';
import { ShellExecution } from 'vscode';
import { platform } from 'os';

export function getShellExecutionForConfig(
  config: PseudoTerminalConfig
): ShellExecution {
  let execution: ShellExecution;
  if (platform() === 'win32') {
    execution = getWin32ShellExecution(config);
  } else {
    execution = getUnixShellExecution(config);
  }

  return execution;
}

function getWin32ShellExecution(config: PseudoTerminalConfig): ShellExecution {
  return new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable:
      'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    shellArgs: [
      `-Sta -NoLogo -NonInteractive -C "& {${config.program.replace(
        / /g,
        '\\ '
      )} ${config.args.join(' ')}}"`
    ]
  });
}

function getUnixShellExecution(config: PseudoTerminalConfig): ShellExecution {
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
