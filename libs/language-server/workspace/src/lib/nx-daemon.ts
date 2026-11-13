import { Logger, runManagedCommand } from '@nx-console/shared-utils';
import {
  getNxExecutionCommand,
  isDotNxInstallation,
} from '@nx-console/shared-npm';

export async function nxStopDaemon(workspacePath: string, logger: Logger) {
  const command = await getNxExecutionCommand({
    cwd: workspacePath,
    displayCommand: 'nx daemon --stop',
    encapsulatedNx: await isDotNxInstallation(workspacePath),
  });
  logger.log(`stopping daemon with ${command}`);
  await runManagedCommand(command, {
    cwd: workspacePath,
    timeoutMs: 30_000,
  });
  logger.log('daemon stopped');
}

export async function nxStartDaemon(workspacePath: string, logger: Logger) {
  const command = await getNxExecutionCommand({
    cwd: workspacePath,
    displayCommand: 'nx daemon --start',
    encapsulatedNx: await isDotNxInstallation(workspacePath),
  });
  logger.log(`starting daemon with ${command}`);

  await runManagedCommand(command, {
    cwd: workspacePath,
    timeoutMs: 90_000,
  });
}
