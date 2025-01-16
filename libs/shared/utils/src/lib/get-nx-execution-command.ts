import { platform } from 'os';
import { getPackageManagerCommand } from './package-manager-command';

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
    const packageManagerCommand = await getPackageManagerCommand(config.cwd);
    command = `${packageManagerCommand.exec} ${command}`;
  }

  return command;
}
