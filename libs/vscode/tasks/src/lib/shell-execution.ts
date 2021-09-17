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
  return new ShellExecution(config.displayCommand, {
    cwd: config.cwd,
    shellArgs: [config.program, ...config.args],
  });
}
