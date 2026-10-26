import type * as NxDaemonClient from 'nx/src/daemon/client/client';
import { getPackageManagerCommand } from '@nx-console/shared-npm';
import {
  Logger,
  ManagedCommandError,
  runManagedCommand,
} from '@nx-console/shared-utils';
import { existsSync } from 'fs';
import { getNxDaemonCache } from './get-nx-workspace-package';

let daemonStartPromise: Promise<void> | null = null;

// `nx daemon --start` itself gives up after about a minute.
const DAEMON_START_TIMEOUT_MS = 90_000;
const MIN_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 10 * 60_000;

// A daemon that failed to start (for example because the machine is out of
// inotify instances) fails the same way on the next attempt, and every caller
// waits for it, so failures are remembered and repeated attempts spaced out.
let failedStarts = 0;
let nextStartAttempt = 0;
let lastStartError: unknown;

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
    failedStarts = 0;
    return;
  }

  // Wait 50ms and check again (daemon might be starting via implicit path)
  await new Promise((resolve) => setTimeout(resolve, 50));

  const isAvailableAfterWait =
    await daemonClientModule.daemonClient.isServerAvailable();
  if (isAvailableAfterWait) {
    logger?.debug?.('Daemon became available after 50ms wait');
    failedStarts = 0;
    return;
  }

  // did someone else win the race in the meantime?
  if (daemonStartPromise) {
    logger.log('Daemon startup already in progress, waiting...');
    await daemonStartPromise;
    return;
  }

  if (failedStarts > 0 && Date.now() < nextStartAttempt) {
    const seconds = Math.ceil((nextStartAttempt - Date.now()) / 1000);
    throw new Error(
      `The Nx daemon failed to start ${failedStarts} time(s), next attempt in ${seconds}s. Last error: ${lastStartError}`,
    );
  }

  // Start daemon with mutex
  daemonStartPromise = (async () => {
    try {
      logger.log('Starting Nx daemon via CLI...');
      const pm = await getPackageManagerCommand(workspacePath, logger);
      await runManagedCommand(`${pm.exec} nx daemon --start`, {
        cwd: workspacePath,
        timeoutMs: DAEMON_START_TIMEOUT_MS,
      });
      failedStarts = 0;
      logger.log('Nx daemon started');
    } catch (e) {
      failedStarts++;
      lastStartError = e;
      nextStartAttempt =
        Date.now() +
        Math.min(
          MIN_RETRY_DELAY_MS * 2 ** (failedStarts - 1),
          MAX_RETRY_DELAY_MS,
        );
      const stderr = e instanceof ManagedCommandError ? e.stderr : '';
      logger.log(
        `Nx daemon failed to start (attempt ${failedStarts}): ${e}${
          stderr ? `\n${stderr}` : ''
        }`,
      );
      throw e;
    } finally {
      daemonStartPromise = null;
    }
  })();

  await daemonStartPromise;
}
