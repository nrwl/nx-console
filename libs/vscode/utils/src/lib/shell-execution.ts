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
  let pmc: PackageManagerCommands;

  if (config.encapsulatedNx) {
    if (platform() == 'win32') {
      command = command.replace(/^nx/, './nx.bat');
    } else {
      command = command.replace(/^nx/, './nx');
    }
  } else {
    if (packageManagerCommands) {
      pmc = packageManagerCommands;
    } else {
      pmc = await getPackageManagerCommand(config.workspacePath ?? config.cwd);
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

  const env = {
    ...config.env,
    NX_CONSOLE: 'true',
  };

  if (pmc.install.includes('pnpm')) {
    env['INIT_CWD'] = config.cwd;
  }

  return new ShellExecution(command, {
    cwd: config.cwd,
    env,
  });
}
