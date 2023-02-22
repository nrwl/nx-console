import { detectPackageManager, getPackageManagerCommand } from '@nrwl/devkit';
import { platform } from 'os';

import { ShellExecution } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
  standaloneNx: boolean;
}

export function getShellExecutionForConfig(
  config: ShellConfig
): ShellExecution {
  let command = config.displayCommand;
  if (config.standaloneNx) {
    if (platform() == 'win32') {
      command = command.replace(/^nx/, './nx.bat');
    } else {
      command = command.replace(/^nx/, './nx');
    }
  } else {
    const packageManager = detectPackageManager(config.cwd);
    const packageManagerCommand = getPackageManagerCommand(packageManager);
    command = `${packageManagerCommand.exec} ${command}`;
  }

  return new ShellExecution(command, {
    cwd: config.cwd,
  });
}
