import { getPackageManagerCommand } from '@nx-console/shared-npm';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { platform } from 'os';

import { ShellExecution, ShellQuotedString, workspace } from 'vscode';

export interface ShellConfig {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
  workspacePath: string;
  env?: { [key: string]: string };
  /**
   * Arguments appended after `displayCommand`. VS Code quotes each one for the user's shell,
   * so pass values that come from outside the extension here instead of in `displayCommand`.
   */
  args?: ShellQuotedString[];
}

export async function getShellExecutionForConfig(
  config: ShellConfig,
  packageManagerCommands?: PackageManagerCommands,
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

  if (pmc?.install?.includes('pnpm')) {
    env['INIT_CWD'] = config.cwd;
  }

  const options = { cwd: config.cwd, env };

  if (config.args) {
    // VS Code quotes a command that contains spaces as a single word, so the package manager prefix
    // (e.g. `pnpm exec`) has to be split into the executable and its own arguments.
    const [executable, ...commandArgs] = command.split(' ').filter(Boolean);
    return new ShellExecution(
      executable,
      [...commandArgs, ...config.args],
      options,
    );
  }

  return new ShellExecution(command, options);
}
