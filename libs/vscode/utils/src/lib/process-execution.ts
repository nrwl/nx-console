import {
  findNxPackagePath,
  getPackageManagerCommand,
  getPnpFile,
} from '@nx-console/shared-npm';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { platform } from 'os';
import { ProcessExecution, ShellExecution, ShellQuoting } from 'vscode';
import {
  buildProcessExecutionCommand,
  ProcessConfig,
} from './process-execution-command';
import { getShellExecutionForConfig } from './shell-execution';

export async function getProcessExecutionForConfig(
  config: ProcessConfig,
  packageManagerCommands?: PackageManagerCommands,
): Promise<ProcessExecution | ShellExecution> {
  const pmc =
    packageManagerCommands ??
    (await getPackageManagerCommand(config.workspacePath ?? config.cwd));
  const nxScript =
    platform() === 'win32' && !config.useLatestNxVersion
      ? await findNxPackagePath(config.workspacePath, 'bin/nx.js')
      : undefined;
  if (
    config.shellFallback &&
    platform() === 'win32' &&
    (!nxScript || config.useLatestNxVersion)
  ) {
    return getShellExecutionForConfig(
      {
        cwd: config.cwd,
        displayCommand: config.useLatestNxVersion ? 'nx@latest' : 'nx',
        encapsulatedNx: config.encapsulatedNx,
        workspacePath: config.workspacePath,
        env: config.env,
        args: config.nxArgs.map((value) => ({
          value,
          quoting: ShellQuoting.Strong,
        })),
      },
      pmc,
    );
  }
  const { executable, args, options } = buildProcessExecutionCommand(
    config,
    pmc,
    platform(),
    nxScript,
    platform() === 'win32' ? await getPnpFile(config.workspacePath) : undefined,
  );
  return new ProcessExecution(executable, args, options);
}
