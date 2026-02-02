import { Logger } from '@nx-console/shared-utils';
import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { execSync } from 'node:child_process';

export async function nxStopDaemon(workspacePath: string, logger: Logger) {
  const packageManagerCommands = await getPackageManagerCommand(
    workspacePath,
    logger,
  );
  const command = `${packageManagerCommands.exec} nx daemon --stop`;
  logger.log(`stopping daemon with ${command}`);
  execSync(command, {
    cwd: workspacePath,
    windowsHide: true,
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

  execSync(command, {
    cwd: workspacePath,
    windowsHide: true,
  });
}
