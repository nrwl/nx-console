import {
  findNxPackagePath,
  getPackageManagerCommand,
  getPnpFile,
} from '@nx-console/shared-npm';
import type { PackageManagerCommands } from 'nx/src/utils/package-manager';
import { platform } from 'os';
import { ProcessExecution } from 'vscode';
import {
  buildProcessExecutionCommand,
  ProcessConfig,
} from './process-execution-command';

export async function getProcessExecutionForConfig(
  config: ProcessConfig,
  packageManagerCommands?: PackageManagerCommands,
): Promise<ProcessExecution> {
  const pmc =
    packageManagerCommands ??
    (await getPackageManagerCommand(config.workspacePath ?? config.cwd));
  const nxScript =
    platform() === 'win32' && !config.useLatestNxVersion
      ? await findNxPackagePath(config.workspacePath, 'bin/nx.js')
      : undefined;
  const { executable, args, options } = buildProcessExecutionCommand(
    config,
    pmc,
    platform(),
    nxScript,
    platform() === 'win32' ? await getPnpFile(config.workspacePath) : undefined,
  );
  return new ProcessExecution(executable, args, options);
}
