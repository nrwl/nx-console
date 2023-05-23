import {
  detectPackageManager,
  getPackageManagerCommand,
} from 'nx/src/devkit-exports';
import { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { platform } from 'os';

import { ShellExecution } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
}

export function getShellExecutionForConfig(
  config: ShellConfig,
  packageManagerCommands?: PackageManagerCommands
): ShellExecution {
  let command = config.displayCommand;
  if (config.encapsulatedNx) {
    if (platform() == 'win32') {
      command = command.replace(/^nx/, './nx.bat');
    } else {
      command = command.replace(/^nx/, './nx');
    }
  } else {
    const pmc =
      packageManagerCommands ??
      getPackageManagerCommand(detectPackageManager(config.cwd));
    command = `${pmc.exec} ${command}`;
  }

  return new ShellExecution(command, {
    cwd: config.cwd,
  });
}
