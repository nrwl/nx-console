import { importNxPackagePath } from '@nx-console/shared/npm';
import { platform } from 'os';

/**
 * see `getShellExecutionForConfig` for a vscode-specific implementation of this
 */
export async function getNxExecutionCommand(config: {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
}): Promise<string> {
  let command = config.displayCommand;
  if (config.encapsulatedNx) {
    if (platform() == 'win32') {
      command = command.replace(/^nx/, './nx.bat');
    } else {
      command = command.replace(/^nx/, './nx');
    }
  } else {
    const { detectPackageManager, getPackageManagerCommand } =
      await importNxPackagePath<typeof import('nx/src/devkit-exports')>(
        config.cwd,
        'src/devkit-exports'
      );
    const packageManager = detectPackageManager(config.cwd);
    const packageManagerCommand = getPackageManagerCommand(packageManager);
    command = `${packageManagerCommand.exec} ${command}`;
  }

  return command;
}
