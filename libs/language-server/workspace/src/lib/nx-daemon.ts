import { Logger, runManagedCommand } from '@nx-console/shared-utils';
import { getPackageManagerCommand } from '@nx-console/shared-npm';

export async function nxStopDaemon(workspacePath: string, logger: Logger) {
  const packageManagerCommands = await getPackageManagerCommand(
    workspacePath,
    logger,
  );
  const command = `${packageManagerCommands.exec} nx daemon --stop`;
  logger.log(`stopping daemon with ${command}`);
  await runManagedCommand(command, {
    cwd: workspacePath,
    timeoutMs: 30_000,
  });
  logger.log('daemon stopped');
}

export async function nxStartDaemon(workspacePath: string, logger: Logger) {
  const packageManagerCommands = await getPackageManagerCommand(
    workspacePath,
    logger,
  );
  const command = `${packageManagerCommands.exec} nx daemon --start`;
  logger.log(`starting daemon with ${command}`);

  await runManagedCommand(command, {
    cwd: workspacePath,
    timeoutMs: 90_000,
  });
}
