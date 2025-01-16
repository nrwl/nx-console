import { getPackageManagerCommand } from '@nx-console/shared-utils';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { platform } from 'os';

import { ShellExecution, workspace } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
  workspacePath: string;
  env?: { [key: string]: string };
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
    let pmc: PackageManagerCommands;
    if (packageManagerCommands) {
      pmc = packageManagerCommands;
    } else {
      pmc = await getPackageManagerCommand(config.cwd);
    }

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
    env: {
      ...config.env,
      NX_CONSOLE: 'true',
    },
  });
}
