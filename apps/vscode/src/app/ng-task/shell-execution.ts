import { ShellExecution } from 'vscode';
import { platform } from 'os';
import { execSync } from 'child_process';

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

let bashPath: string;
function getUnixShellExecution(config: ShellConfig): ShellExecution {
  if (!bashPath) {
    try {
      bashPath =
        execSync('which bash')
          .toString()
          .trim() || '/bin/bash';
    } catch {
      bashPath = '/bin/bash'; // Default to where bash is usually installed.
    }
  }
  return new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    executable: bashPath,
    shellArgs: [
      '-l',
      '-c',
      `${config.program.replace(/ /g, '\\ ')} ${config.args.join(' ')}`
    ]
  });
}
