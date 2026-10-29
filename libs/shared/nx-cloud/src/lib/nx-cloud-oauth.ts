import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { runManagedCommand } from '@nx-console/shared-utils';
import { getNxCloudConfigIni } from './nx-cloud-config-ini';

export const NX_CLOUD_OAUTH_ACCESS_TOKEN_HEADER = 'Nx-Cloud-OAuth-Access-Token';

// the nx-cloud client also refreshes tokens that expire within a minute
const REFRESH_SKEW_MS = 60_000;
const REFRESH_TIMEOUT_MS = 30_000;
const REFRESH_RETRY_DELAY_MS = 60_000;

let refreshPromise: Promise<void> | null = null;
let nextRefreshAttempt = 0;

/**
 * Returns the access token that `nx login` stored in nxcloud.ini, or undefined
 * when there is no OAuth login or its token could not be refreshed.
 *
 * Access tokens are short-lived and their refresh tokens rotate, so an expired
 * token is refreshed by the nx-cloud CLI, which owns the stored credential and
 * the lock that guards it.
 */
export async function getNxCloudOAuthAccessToken(
  workspacePath: string,
  nxCloudUrl: string,
): Promise<string | undefined> {
  const credential = readOAuthCredential(nxCloudUrl);
  if (!credential) {
    return undefined;
  }
  if (isFresh(credential)) {
    return credential.accessToken;
  }

  await refreshOAuthCredential(workspacePath);

  const refreshed = readOAuthCredential(nxCloudUrl);
  return refreshed && isFresh(refreshed) ? refreshed.accessToken : undefined;
}

function readOAuthCredential(
  nxCloudUrl: string,
): { accessToken: string; expiresAt: number } | undefined {
  const section = getNxCloudConfigIni()?.[nxCloudUrl.replace(/\/+$/, '')];
  const accessToken = section?.oauthAccessToken;
  const expiresAt = Date.parse(section?.oauthAccessTokenExpiresAt);
  if (typeof accessToken !== 'string' || !accessToken || isNaN(expiresAt)) {
    return undefined;
  }
  return { accessToken, expiresAt };
}

function isFresh(credential: { expiresAt: number }): boolean {
  return credential.expiresAt > Date.now() + REFRESH_SKEW_MS;
}

function refreshOAuthCredential(workspacePath: string): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }
  if (Date.now() < nextRefreshAttempt) {
    return Promise.resolve();
  }

  // `login --status` refreshes an expiring token before it reports the login
  refreshPromise = (async () => {
    try {
      const pm = await getPackageManagerCommand(workspacePath);
      await runManagedCommand(`${pm.exec} nx-cloud login --status`, {
        cwd: workspacePath,
        timeoutMs: REFRESH_TIMEOUT_MS,
      });
    } catch {
      // the caller falls back to the other credentials
    } finally {
      // a refreshed token lasts far longer than this, so only failed or
      // ineffective refreshes are held back from spawning on every request
      nextRefreshAttempt = Date.now() + REFRESH_RETRY_DELAY_MS;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
