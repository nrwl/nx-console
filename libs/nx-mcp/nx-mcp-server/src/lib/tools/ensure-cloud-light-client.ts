import { Logger } from '@nx-console/shared-utils';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function getCloudLightClient(
  logger: Logger,
  workspacePath: string,
): any {
  let cacheDir;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cacheDir = require(
      require.resolve('nx/src/devkit-exports', {
        paths: [workspacePath],
      }),
    ).cacheDir;
  } catch (e: any) {
    logger.log(
      `Could not load cacheDir from nx devkit-exports, falling back to default: ${e.message}`,
    );
    cacheDir = join(workspacePath, '.nx', 'cache');
  }

  logger.log(`Using cloud client cache directory: ${cacheDir}`);
  const cloudLocation = join(cacheDir, 'cloud');
  let lightClientBundle;
  try {
    const installedBundles = readdirSync(cloudLocation)
      .filter((potentialDirectory) => {
        return statSync(join(cloudLocation, potentialDirectory)).isDirectory();
      })
      .map((fileOrDirectory) => ({
        version: fileOrDirectory,
        fullPath: join(cloudLocation, fileOrDirectory),
      }));

    if (installedBundles.length === 0) {
      if (process.env.NX_VERBOSE_LOGGING === 'true') {
        logger.log(`No installed bundles`);
      }

      // No installed bundles
      return null;
    }

    lightClientBundle = installedBundles[0];
  } catch (e: any) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.log('Could not read runner bundle path:', e.message);
    }
    return null;
  }

  let nxCloudClient;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nxCloudClient = require(
      lightClientBundle.fullPath + '/lib/polygraph/polygraph-handlers.js',
    );
  } catch (e: any) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.log(`Could not load Polygraph client: ${e.message}`);
    }
    return null;
  }
  return nxCloudClient;
}

let clientPromise: Promise<any> | undefined;
let lastFailureTime = 0;
export const RETRY_COOLDOWN_MS = 30_000;

async function resolveCloudLightClient(
  logger: Logger,
  workspacePath: string,
): Promise<any> {
  let client = getCloudLightClient(logger, workspacePath);

  if (!client) {
    logger.log('Cloud client bundle not found. Attempting to download...');
    try {
      const { stdout, stderr } = await execAsync(
        'npx nx@latest download-cloud-client',
        {
          cwd: workspacePath,
          timeout: 60000,
        },
      );
      if (stdout) {
        logger.log(`download-cloud-client stdout: ${stdout.trim()}`);
      }
      if (stderr) {
        logger.log(`download-cloud-client stderr: ${stderr.trim()}`);
      }
      client = getCloudLightClient(logger, workspacePath);
      if (client) {
        logger.log('Cloud client bundle downloaded successfully');
      }
    } catch (e: any) {
      const stdout = e.stdout?.trim();
      const stderr = e.stderr?.trim();
      if (stdout) {
        logger.log(`download-cloud-client stdout: ${stdout}`);
      }
      if (stderr) {
        logger.log(`download-cloud-client stderr: ${stderr}`);
      }
      logger.log(`Failed to download cloud client: ${e.message}`);
    }
  }

  if (!client) {
    lastFailureTime = Date.now();
    clientPromise = undefined;
  }

  return client ?? null;
}

export async function ensureCloudLightClient(
  logger: Logger,
  workspacePath: string,
): Promise<any> {
  if (!clientPromise) {
    if (Date.now() - lastFailureTime < RETRY_COOLDOWN_MS) {
      return null;
    }
    clientPromise = resolveCloudLightClient(logger, workspacePath);
  }
  return clientPromise;
}

export function resetCachedClient() {
  clientPromise = undefined;
  lastFailureTime = 0;
}
