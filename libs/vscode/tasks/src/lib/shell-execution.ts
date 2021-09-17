import { ShellExecution } from 'vscode';

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
  return new ShellExecution(
    `${config.program.replace(/\\/g, '/')} ${config.args.join(' ')}`,
    {
      cwd: config.cwd,
    }
  );
}
