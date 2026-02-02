import type * as NxDaemonClient from 'nx/src/daemon/client/client';
import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { Logger } from '@nx-console/shared-utils';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getNxDaemonCache } from './get-nx-workspace-package';

let daemonStartPromise: Promise<void> | null = null;

export async function ensureDaemonIsStarted(
  workspacePath: string,
  logger: Logger,
  daemonClientModule: typeof NxDaemonClient | undefined,
): Promise<void> {
  logger.log('ensureDaemonIsStarted called');

  // If already starting via this function, wait for that to complete
  if (daemonStartPromise) {
    logger.log('Daemon startup already in progress, waiting...');
    await daemonStartPromise;
    return;
  }

  // Check if daemon is enabled
  if (!daemonClientModule?.daemonClient?.enabled()) {
    return;
  }

  // First check - is daemon already available?
  const isAvailable = await daemonClientModule.daemonClient.isServerAvailable();
  if (isAvailable) {
    return;
  }

  // Wait 50ms and check again (daemon might be starting via implicit path)
  await new Promise((resolve) => setTimeout(resolve, 50));

  const isAvailableAfterWait =
    await daemonClientModule.daemonClient.isServerAvailable();
  if (isAvailableAfterWait) {
    logger?.debug?.('Daemon became available after 50ms wait');
    return;
  }

  // did someone else win the race in the meantime?
  if (daemonStartPromise) {
    logger.log('Daemon startup already in progress, waiting...');
    await daemonStartPromise;
    return;
  }

  // Start daemon with mutex
  daemonStartPromise = (async () => {
    try {
      logger.log('Starting Nx daemon via CLI...');
      const pm = await getPackageManagerCommand(workspacePath, logger);
      execSync(`${pm.exec} nx daemon --start`, {
        cwd: workspacePath,
        windowsHide: true,
      });
      logger.log('Nx daemon started');
    } finally {
      daemonStartPromise = null;
    }
  })();

  await daemonStartPromise;
}
