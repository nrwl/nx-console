import { Logger } from '@nx-console/shared-schema';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import { execSync } from 'node:child_process';

export async function nxStopDaemon(workspacePath: string, logger: Logger) {
  logger.log('stopping daemon with `nx daemon --stop`');

  const packageManagerCommands = await getPackageManagerCommand(
    workspacePath,
    logger
  );
  execSync(`${packageManagerCommands.exec} nx daemon --stop`, {
    cwd: workspacePath,
    windowsHide: true,
  });
}
