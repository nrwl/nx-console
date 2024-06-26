import { importNxPackagePath } from '@nx-console/shared/npm';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { platform } from 'os';

import { ShellExecution, workspace } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
  workspacePath: string;
}

export async function getShellExecutionForConfig(
  config: ShellConfig,
  packageManagerCommands?: PackageManagerCommands
): Promise<ShellExecution> {
  let command = config.displayCommand;
  if (config.encapsulatedNx) {
    if (platform() == 'win32') {
      command = command.replace(/^nx/, './nx.bat');
    } else {
      command = command.replace(/^nx/, './nx');
    }
  } else {
    const { detectPackageManager, getPackageManagerCommand } =
      await importNxPackagePath<typeof import('nx/src/utils/package-manager')>(
        config.workspacePath,
        'src/utils/package-manager'
      );
    const pmc =
      packageManagerCommands ??
      getPackageManagerCommand(detectPackageManager(config.cwd));
    command = `${pmc.exec} ${command}`;
  }

  const isPowershell =
    platform() === 'win32' &&
    workspace
      .getConfiguration('terminal')
      .get('integrated.defaultProfile.windows') === 'PowerShell';

  if (isPowershell) {
    command = command.replace(/"/g, '\\"');
  }

  return new ShellExecution(command, {
    cwd: config.cwd,
  });
}
