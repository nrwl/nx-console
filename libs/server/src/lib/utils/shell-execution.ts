import { detectPackageManager, getPackageManagerCommand } from '@nrwl/devkit';
import { ShellExecution } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
}

export function getShellExecutionForConfig(
  config: ShellConfig
): ShellExecution {
  const packageManager = detectPackageManager(config.cwd);
  const packageManagerCommand = getPackageManagerCommand(packageManager);

  return new ShellExecution(
    `${packageManagerCommand.exec} ${config.displayCommand}`,
    {
      cwd: config.cwd,
    }
  );
}
