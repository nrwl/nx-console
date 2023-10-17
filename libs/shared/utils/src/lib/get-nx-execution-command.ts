import {
  detectPackageManager,
  getPackageManagerCommand,
} from 'nx/src/devkit-exports';
import { platform } from 'os';

/**
 * see `getShellExecutionForConfig` for a vscode-specific implementation of this
 */
export function getNxExecutionCommand(config: {
  cwd: string;
  displayCommand: string;
  encapsulatedNx: boolean;
}): string {
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
    if (packageManager === 'yarn') {
      command = `${packageManagerCommand.exec} --silent ${command}`;
    } else {
      command = `${packageManagerCommand.exec} ${command}`;
    }
  }

  return command;
}
