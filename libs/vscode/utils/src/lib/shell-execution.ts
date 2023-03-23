import {
  detectPackageManager,
  getPackageManagerCommand,
} from 'nx/src/devkit-exports';
import { platform } from 'os';

import { ShellExecution } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
}

export function getShellExecutionForConfig(
  config: ShellConfig
): ShellExecution {
  let command = config.displayCommand;
  if (config.encapsulatedNx) {
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
